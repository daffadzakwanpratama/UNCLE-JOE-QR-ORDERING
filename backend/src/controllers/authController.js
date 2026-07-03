const bcrypt = require("bcryptjs");
const { query } = require("../config/db");
const { createAdminToken } = require("../utils/adminToken");
const { serializeCookie } = require("../utils/cookies");
const { requireNonEmptyString } = require("../utils/validation");

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

async function login(request, response) {
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
    const { recordFailedLoginAttempt } = require("../middlewares/adminLoginRateLimit");
    recordFailedLoginAttempt(request);
    return response.status(401).json({
      success: false,
      message: "Username atau password salah.",
    });
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

  if (!isPasswordValid) {
    const { recordFailedLoginAttempt } = require("../middlewares/adminLoginRateLimit");
    recordFailedLoginAttempt(request);
    return response.status(401).json({
      success: false,
      message: "Username atau password salah.",
    });
  }

  const { clearFailedLoginAttempts } = require("../middlewares/adminLoginRateLimit");
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
}

async function getSession(request, response) {
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
}

async function logout(request, response) {
  clearAdminAuthCookie(request, response);
  response.json({
    success: true,
    message: "Logout berhasil.",
  });
}

async function getUsers(request, response) {
  const admins = await query(
    `SELECT id, username, full_name AS "fullName", role, created_at AS "createdAt"
     FROM admins
     ORDER BY username ASC`
  );
  response.json({
    success: true,
    data: admins,
  });
}

async function createUser(request, response) {
  if (request.admin.role !== "admin") {
    return response.status(403).json({
      success: false,
      message: "Akses ditolak. Hanya Administrator yang dapat menambahkan pengguna baru.",
    });
  }

  const username = requireNonEmptyString(request.body?.username, "Username wajib diisi.", { maxLength: 50 });
  const fullName = requireNonEmptyString(request.body?.fullName, "Nama lengkap wajib diisi.", { maxLength: 100 });
  const password = requireNonEmptyString(request.body?.password, "Password wajib diisi.", { maxLength: 255 });
  const role = requireNonEmptyString(request.body?.role, "Role wajib diisi.", { maxLength: 30 });

  const existing = await query(
    `SELECT id FROM admins WHERE username = :username LIMIT 1`,
    { username }
  );

  if (existing.length > 0) {
    return response.status(400).json({
      success: false,
      message: "Username sudah digunakan.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `INSERT INTO admins (username, full_name, password_hash, role)
     VALUES (:username, :fullName, :passwordHash, :role)`,
    { username, fullName, passwordHash, role }
  );

  response.json({
    success: true,
    message: "Pengguna admin berhasil ditambahkan.",
  });
}

async function updateUserPassword(request, response) {
  const targetId = Number(request.params.id);
  const password = requireNonEmptyString(request.body?.password, "Password baru wajib diisi.", { maxLength: 255 });

  if (request.admin.role !== "admin" && Number(request.admin.sub) !== targetId) {
    return response.status(403).json({
      success: false,
      message: "Akses ditolak. Anda hanya dapat mengubah password Anda sendiri.",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await query(
    `UPDATE admins
     SET password_hash = :passwordHash, updated_at = CURRENT_TIMESTAMP
     WHERE id = :targetId`,
    { passwordHash, targetId }
  );

  response.json({
    success: true,
    message: "Password berhasil diperbarui.",
  });
}

async function updateUserRole(request, response) {
  if (request.admin.role !== "admin") {
    return response.status(403).json({
      success: false,
      message: "Akses ditolak. Hanya Administrator yang dapat mengubah role.",
    });
  }

  const targetId = Number(request.params.id);
  const role = requireNonEmptyString(request.body?.role, "Role wajib diisi.", { maxLength: 30 });

  await query(
    `UPDATE admins
     SET role = :role, updated_at = CURRENT_TIMESTAMP
     WHERE id = :targetId`,
    { role, targetId }
  );

  response.json({
    success: true,
    message: "Role pengguna berhasil diperbarui.",
  });
}

async function deleteUser(request, response) {
  if (request.admin.role !== "admin") {
    return response.status(403).json({
      success: false,
      message: "Akses ditolak. Hanya Administrator yang dapat menghapus pengguna.",
    });
  }

  const targetId = Number(request.params.id);
  if (Number(request.admin.sub) === targetId) {
    return response.status(400).json({
      success: false,
      message: "Anda tidak dapat menghapus akun Anda sendiri.",
    });
  }

  await query(
    `DELETE FROM admins WHERE id = :targetId`,
    { targetId }
  );

  response.json({
    success: true,
    message: "Pengguna admin berhasil dihapus.",
  });
}

module.exports = {
  login,
  getSession,
  logout,
  getUsers,
  createUser,
  updateUserPassword,
  updateUserRole,
  deleteUser,
};
