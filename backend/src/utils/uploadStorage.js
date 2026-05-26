const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PUBLIC_DIR = path.resolve(__dirname, "..", "..", "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");
const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/;
const DEFAULT_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ALLOWED_UPLOAD_STORAGE_MODES = new Set(["local", "external-url"]);

const MIME_EXTENSION_MAP = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/svg+xml": ".svg",
};

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
    return process.env.NODE_ENV === "production" ? "local" : "local";
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
  return typeof value === "string" && value.startsWith("/uploads/");
}

function isExternalImageUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
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

function deleteManagedFile(filePath) {
  if (!isManagedUploadPath(filePath)) {
    return;
  }

  const absolutePath = path.join(PUBLIC_DIR, filePath.replace(/^\//, ""));

  if (absolutePath.startsWith(UPLOADS_DIR) && fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

function persistDataUrlImage(dataUrl, scope) {
  const match = String(dataUrl || "").match(DATA_URL_PATTERN);

  if (!match) {
    return dataUrl || null;
  }

  if (getUploadStorageMode() !== "local") {
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

  const scopeDir = path.join(UPLOADS_DIR, scope);
  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(scopeDir, fileName);
  const relativePath = `/uploads/${scope}/${fileName}`;

  ensureDirectory(scopeDir);
  fs.writeFileSync(absolutePath, imageBuffer);

  return relativePath;
}

function saveImageValue(imageValue, scope, previousValue = "") {
  const normalizedImageValue = normalizeImageValue(imageValue);
  const normalizedPreviousValue = normalizeImageValue(previousValue);

  if (!normalizedImageValue) {
    if (normalizedPreviousValue) {
      deleteManagedFile(normalizedPreviousValue);
    }

    return null;
  }

  const nextValue = persistDataUrlImage(normalizedImageValue, scope);

  if (nextValue !== normalizedImageValue && normalizedPreviousValue && normalizedPreviousValue !== nextValue) {
    deleteManagedFile(normalizedPreviousValue);
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
