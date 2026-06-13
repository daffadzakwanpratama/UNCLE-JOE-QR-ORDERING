const crypto = require("crypto");

const DEFAULT_EXPIRES_IN_SECONDS = 60 * 60 * 12;

function getTokenSecret() {
  return process.env.JWT_SECRET || "";
}

function getTokenExpirySeconds() {
  return Number(process.env.ADMIN_TOKEN_EXPIRES_IN_SECONDS || DEFAULT_EXPIRES_IN_SECONDS);
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signValue(value) {
  return toBase64Url(
    crypto.createHmac("sha256", getTokenSecret()).update(value).digest()
  );
}

function createAdminToken(admin) {
  const secret = getTokenSecret();

  if (!secret) {
    throw new Error("JWT_SECRET wajib diisi sebelum login admin digunakan.");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    sub: Number(admin.id),
    username: String(admin.username || "").trim(),
    role: String(admin.role || "admin").trim(),
    iat: issuedAt,
    exp: issuedAt + getTokenExpirySeconds(),
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

function verifyAdminToken(token) {
  const secret = getTokenSecret();

  if (!secret) {
    throw new Error("JWT_SECRET wajib diisi sebelum token admin diverifikasi.");
  }

  const [encodedPayload = "", receivedSignature = ""] = String(token || "").split(".");

  if (!encodedPayload || !receivedSignature) {
    throw new Error("Token admin tidak valid.");
  }

  const expectedSignature = signValue(encodedPayload);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(receivedSignature);

  if (expectedBuffer.length !== receivedBuffer.length) {
    throw new Error("Token admin tidak valid.");
  }

  const signaturesMatch = crypto.timingSafeEqual(receivedBuffer, expectedBuffer);

  if (!signaturesMatch) {
    throw new Error("Token admin tidak valid.");
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload));
  const now = Math.floor(Date.now() / 1000);

  if (!payload?.sub || !payload?.username || !payload?.exp || payload.exp <= now) {
    throw new Error("Sesi admin sudah berakhir. Silakan login kembali.");
  }

  return payload;
}

module.exports = {
  createAdminToken,
  verifyAdminToken,
};
