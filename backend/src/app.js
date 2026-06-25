const express = require("express");
const cors = require("cors");
const path = require("path");
const apiRoutes = require("./routes");
const { createCorsOptions } = require("./config/cors");
const { requestLogger } = require("./middlewares/requestLogger");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

function normalizeTableNumber(value = "") {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 30);
}

function parseTrustProxySetting() {
  const rawValue = String(process.env.TRUST_PROXY || "").trim();

  if (!rawValue) {
    return process.env.NODE_ENV === "production" ? 1 : false;
  }

  if (["true", "yes", "on"].includes(rawValue.toLowerCase())) {
    return true;
  }

  if (["false", "no", "off", "0"].includes(rawValue.toLowerCase())) {
    return false;
  }

  const numericValue = Number(rawValue);
  return Number.isInteger(numericValue) && numericValue >= 0 ? numericValue : rawValue;
}

function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  const projectRoot = path.resolve(__dirname, "..", "..");
  const userFrontendPath = path.join(projectRoot, "frontend", "user");
  const adminFrontendPath = path.join(projectRoot, "frontend", "admin");
  const sharedFrontendPath = path.join(projectRoot, "frontend", "shared");
  const uploadsPath = path.join(projectRoot, "public", "uploads");

  app.set("trust proxy", parseTrustProxySetting());
  app.use(cors(createCorsOptions()));
  app.use(requestLogger);
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Disable caching for all API responses
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  app.get("/", (request, response) => {
    response.redirect("/user/pages/index.html");
  });

  app.get("/admin", (request, response) => {
    response.redirect("/admin/pages/login.html");
  });

  app.get("/table/:tableNumber", (request, response) => {
    const tableNumber = normalizeTableNumber(request.params.tableNumber);

    if (!tableNumber) {
      return response.redirect("/user/pages/index.html");
    }

    const searchParams = new URLSearchParams({ table: tableNumber });
    return response.redirect(`/user/pages/index.html?${searchParams.toString()}`);
  });

  app.use("/uploads", express.static(uploadsPath));
  app.use("/user", express.static(userFrontendPath));
  app.use("/admin", express.static(adminFrontendPath));
  app.use("/shared", express.static(sharedFrontendPath));

  app.use("/api", apiRoutes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
