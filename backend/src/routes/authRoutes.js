const express = require("express");
const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { createAdminToken } = require("../utils/adminToken");
const { requireAdminAuth } = require("../middlewares/adminAuth");
const {
  adminLoginRateLimit,
  recordFailedLoginAttempt,
  clearFailedLoginAttempts,
} = require("../middlewares/adminLoginRateLimit");
const { serializeCookie } = require("../utils/cookies");
const { asyncHandler } = require("../utils/asyncHandler");
const { requireNonEmptyString } = require("../utils/validation");

const router = express.Router();

function getAdminCookieName() {
  return process.env.ADMIN_COOKIE_NAME || "qr_ordering_admin";
}

function getAdminCookieSameSite() {
  const value = String(process.env.ADMIN_COOKIE_SAME_SITE || "Lax").trim();
  const normalizedValue = value.toLowerCase();

  if (["lax", "strict", "none"].includes(normalizedValue)) {
    return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1);
  }

  return "Lax";
}

function getAdminCookieDomain() {
  return String(process.env.ADMIN_COOKIE_DOMAIN || "").trim() || undefined;
}

function isSecureCookieEnabled(request) {
  const explicitValue = String(process.env.ADMIN_COOKIE_SECURE || "").trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(explicitValue)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(explicitValue)) {
    return false;
  }

  if (process.env.NODE_ENV === "production") {
    return true;
  }

  return Boolean(request.secure);
}

function getAdminCookieOptions(request, maxAge) {
  const sameSite = getAdminCookieSameSite();
  const secure = isSecureCookieEnabled(request);

  if (sameSite === "None" && !secure) {
    throw new Error("ADMIN_COOKIE_SAME_SITE=None membutuhkan ADMIN_COOKIE_SECURE=true.");
  }

  return {
    httpOnly: true,
    maxAge,
    path: "/",
    sameSite,
    secure,
    domain: getAdminCookieDomain(),
  };
}

function setAdminAuthCookie(request, response, token) {
  response.setHeader("Set-Cookie", serializeCookie(getAdminCookieName(), token, {
    ...getAdminCookieOptions(
      request,
      Number(process.env.ADMIN_TOKEN_EXPIRES_IN_SECONDS || 60 * 60 * 12)
    ),
  }));
}

function clearAdminAuthCookie(request, response) {
  response.setHeader("Set-Cookie", serializeCookie(getAdminCookieName(), "", {
    ...getAdminCookieOptions(request, 0),
    maxAge: 0,
  }));
}

router.post("/admin/login", adminLoginRateLimit, asyncHandler(async (request, response) => {
  const username = requireNonEmptyString(
    request.body?.username,
    "Username dan password wajib diisi.",
    { maxLength: 50 }
  );
  const password = requireNonEmptyString(
    request.body?.password,
    "Username dan password wajib diisi.",
    { maxLength: 255 }
  );

  const admins = await query(
    `SELECT id, username, password_hash, full_name, role
     FROM admins
     WHERE username = :username
     LIMIT 1`,
    { username }
  );

  const admin = admins[0];

  if (!admin) {
    recordFailedLoginAttempt(request);
    return response.status(401).json({
      success: false,
      message: "Username atau password salah.",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

  if (!isPasswordValid) {
    recordFailedLoginAttempt(request);
    return response.status(401).json({
      success: false,
      message: "Username atau password salah.",
    });
  }

  clearFailedLoginAttempts(request);

  const token = createAdminToken(admin);
  setAdminAuthCookie(request, response, token);

  response.json({
    success: true,
    data: {
      id: admin.id,
      username: admin.username,
      fullName: admin.full_name,
      role: admin.role,
    },
  });
}));

router.get("/admin/session", requireAdminAuth, asyncHandler(async (request, response) => {
  const admins = await query(
    `SELECT id, username, full_name, role
     FROM admins
     WHERE id = :adminId
     LIMIT 1`,
    { adminId: Number(request.admin.sub) }
  );

  const admin = admins[0];

  if (!admin) {
    clearAdminAuthCookie(request, response);
    return response.status(401).json({
      success: false,
      message: "Sesi admin tidak ditemukan.",
    });
  }

  response.json({
    success: true,
    data: {
      id: admin.id,
      username: admin.username,
      fullName: admin.full_name,
      role: admin.role,
    },
  });
}));

router.post("/admin/logout", asyncHandler(async (request, response) => {
  clearAdminAuthCookie(request, response);
  response.json({
    success: true,
    message: "Logout berhasil.",
  });
}));

module.exports = router;
