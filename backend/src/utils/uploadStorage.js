const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const PUBLIC_DIR = path.resolve(__dirname, "..", "..", "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;
const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_UPLOAD_STORAGE_MODES = new Set(["local", "external-url", "supabase"]);

const MIME_EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

let supabaseClientInstance = null;

function getSupabaseClient() {
  if (!supabaseClientInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus dikonfigurasi di .env untuk menggunakan Supabase Storage."
      );
    }
    supabaseClientInstance = createClient(url, key, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseClientInstance;
}

function getSupabasePrefix() {
  const url = process.env.SUPABASE_URL || "https://nbkveawalrzyxslnqfrt.supabase.co";
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
  return `${url}/storage/v1/object/public/${bucket}/`;
}

function isSupabaseUploadUrl(value) {
  if (typeof value !== "string") return false;
  return value.startsWith(getSupabasePrefix());
}

function ensureDirectory(directoryPath) {
  fs.mkdirSync(directoryPath, { recursive: true });
}

function getExtensionFromMimeType(mimeType) {
  return MIME_EXTENSION_MAP[mimeType] || "";
}

function getMaxUploadBytes() {
  const value = Number(process.env.MAX_UPLOAD_IMAGE_BYTES || DEFAULT_MAX_UPLOAD_BYTES);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_MAX_UPLOAD_BYTES;
}

function getUploadStorageMode() {
  const rawValue = String(process.env.UPLOAD_STORAGE_MODE || "").trim().toLowerCase();

  if (!rawValue) {
    return "local";
  }

  return rawValue;
}

function validateUploadStorageConfiguration() {
  const mode = getUploadStorageMode();

  if (!ALLOWED_UPLOAD_STORAGE_MODES.has(mode)) {
    throw new Error(
      `UPLOAD_STORAGE_MODE tidak valid. Gunakan salah satu: ${Array.from(ALLOWED_UPLOAD_STORAGE_MODES).join(", ")}.`
    );
  }

  if (process.env.NODE_ENV === "production" && !String(process.env.UPLOAD_STORAGE_MODE || "").trim()) {
    throw new Error(
      "UPLOAD_STORAGE_MODE wajib diisi saat NODE_ENV=production agar strategi penyimpanan gambar eksplisit."
    );
  }
}

function createUploadError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isManagedUploadPath(value) {
  return (typeof value === "string" && value.startsWith("/uploads/")) || isSupabaseUploadUrl(value);
}

function isExternalImageUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value) && !isSupabaseUploadUrl(value);
}

function normalizeImageValue(imageValue) {
  if (!imageValue || typeof imageValue !== "string") {
    return imageValue || "";
  }

  if (isManagedUploadPath(imageValue) || imageValue.startsWith("data:") || isExternalImageUrl(imageValue)) {
    return imageValue;
  }

  try {
    const parsedUrl = new URL(imageValue);
    if (isManagedUploadPath(parsedUrl.pathname)) {
      return parsedUrl.pathname;
    }
  } catch (error) {
    return imageValue;
  }

  return imageValue;
}

async function deleteManagedFile(filePath) {
  if (!filePath) {
    return;
  }

  const mode = getUploadStorageMode();

  if (mode === "supabase" || isSupabaseUploadUrl(filePath)) {
    try {
      const bucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
      const prefix = getSupabasePrefix();
      if (filePath.startsWith(prefix)) {
        const relativePath = filePath.replace(prefix, "");
        const supabase = getSupabaseClient();
        const { error } = await supabase.storage.from(bucket).remove([relativePath]);
        if (error) {
          console.error(`Gagal menghapus file dari Supabase Storage (${filePath}):`, error.message);
        } else {
          console.log(`Berhasil menghapus file dari Supabase Storage: ${relativePath}`);
        }
      }
    } catch (err) {
      console.error("Terjadi error saat menghapus file dari Supabase Storage:", err.message || err);
    }
    return;
  }

  // Fallback ke local delete jika bukan Supabase
  if (!isManagedUploadPath(filePath) || isSupabaseUploadUrl(filePath)) {
    return;
  }

  const absolutePath = path.join(PUBLIC_DIR, filePath.replace(/^\//, ""));

  if (absolutePath.startsWith(UPLOADS_DIR) && fs.existsSync(absolutePath)) {
    try {
      fs.unlinkSync(absolutePath);
      console.log(`Berhasil menghapus file lokal: ${filePath}`);
    } catch (err) {
      console.error(`Gagal menghapus file lokal (${filePath}):`, err.message || err);
    }
  }
}

async function persistDataUrlImage(dataUrl, scope) {
  const match = String(dataUrl || "").match(DATA_URL_PATTERN);

  if (!match) {
    return dataUrl || null;
  }

  const mode = getUploadStorageMode();

  if (mode !== "local" && mode !== "supabase") {
    throw createUploadError(
      "Upload gambar base64 dinonaktifkan untuk mode storage saat ini. Gunakan URL gambar eksternal.",
      400
    );
  }

  const [, mimeType, base64Body] = match;
  const extension = getExtensionFromMimeType(mimeType);

  if (!extension) {
    throw createUploadError("Format gambar tidak didukung.");
  }

  const imageBuffer = Buffer.from(base64Body, "base64");

  if (imageBuffer.length > getMaxUploadBytes()) {
    throw createUploadError("Ukuran gambar melebihi batas yang diizinkan.", 413);
  }

  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;

  if (mode === "supabase") {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
    const relativePath = `${scope}/${fileName}`;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(relativePath, imageBuffer, {
        contentType: mimeType,
        duplex: "half", // Diperlukan untuk Node stream upload
      });

    if (error) {
      throw createUploadError(`Gagal mengunggah gambar ke Supabase Storage: ${error.message}`, 500);
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(relativePath);

    return publicUrlData.publicUrl;
  }

  // Fallback ke local write jika mode === "local"
  const scopeDir = path.join(UPLOADS_DIR, scope);
  const absolutePath = path.join(scopeDir, fileName);
  const localRelativePath = `/uploads/${scope}/${fileName}`;

  ensureDirectory(scopeDir);
  fs.writeFileSync(absolutePath, imageBuffer);

  return localRelativePath;
}

async function saveImageValue(imageValue, scope, previousValue = "") {
  const normalizedImageValue = normalizeImageValue(imageValue);
  const normalizedPreviousValue = normalizeImageValue(previousValue);

  if (!normalizedImageValue) {
    if (normalizedPreviousValue) {
      await deleteManagedFile(normalizedPreviousValue);
    }

    return null;
  }

  const nextValue = await persistDataUrlImage(normalizedImageValue, scope);

  if (nextValue !== normalizedImageValue && normalizedPreviousValue && normalizedPreviousValue !== nextValue) {
    await deleteManagedFile(normalizedPreviousValue);
  }

  return nextValue;
}

module.exports = {
  getUploadStorageMode,
  validateUploadStorageConfiguration,
  isManagedUploadPath,
  isExternalImageUrl,
  deleteManagedFile,
  saveImageValue,
};
