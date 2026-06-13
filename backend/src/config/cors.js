function isProduction() {
  return process.env.NODE_ENV === "production";
}

function parseAllowedOrigins() {
  const value = String(process.env.FRONTEND_ORIGIN || "").trim();

  if (!value || value === "*") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function validateCorsConfiguration() {
  const rawValue = String(process.env.FRONTEND_ORIGIN || "").trim();

  if (isProduction() && !process.env.VERCEL && (!rawValue || rawValue === "*")) {
    throw new Error(
      "FRONTEND_ORIGIN wajib diisi dengan domain frontend yang spesifik saat NODE_ENV=production."
    );
  }
}

function createCorsOptions() {
  validateCorsConfiguration();

  const allowedOrigins = parseAllowedOrigins();
  const allowAllOrigins = allowedOrigins.length === 0;

  return {
    credentials: !allowAllOrigins,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowAllOrigins || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin tidak diizinkan: ${origin}`));
    },
  };
}

module.exports = {
  createCorsOptions,
  parseAllowedOrigins,
  validateCorsConfiguration,
};
