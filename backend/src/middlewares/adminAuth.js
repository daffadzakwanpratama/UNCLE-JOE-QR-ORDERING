const { verifyAdminToken } = require("../utils/adminToken");
const { parseCookies } = require("../utils/cookies");

function getAdminCookieName() {
  return process.env.ADMIN_COOKIE_NAME || "qr_ordering_admin";
}

function readBearerToken(request) {
  const authorizationHeader = String(request.headers.authorization || "").trim();

  if (!authorizationHeader.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return authorizationHeader.slice(7).trim();
}

function readCookieToken(request) {
  const cookies = parseCookies(request.headers.cookie || "");
  return String(cookies[getAdminCookieName()] || "").trim();
}

function requireAdminAuth(request, response, next) {
  try {
    const token = readBearerToken(request) || readCookieToken(request);

    if (!token) {
      return response.status(401).json({
        success: false,
        message: "Akses admin memerlukan login.",
      });
    }

    request.admin = verifyAdminToken(token);
    return next();
  } catch (error) {
    return response.status(401).json({
      success: false,
      message: error.message || "Sesi admin tidak valid.",
    });
  }
}

module.exports = {
  requireAdminAuth,
};
