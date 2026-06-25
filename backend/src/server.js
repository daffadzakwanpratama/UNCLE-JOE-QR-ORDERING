const dotenv = require("dotenv");
const { createApp } = require("./app");
const { testConnection, migrateDatabase } = require("./config/db");
const { parseAllowedOrigins, validateCorsConfiguration } = require("./config/cors");
const {
  getUploadStorageMode,
  validateUploadStorageConfiguration,
} = require("./utils/uploadStorage");

dotenv.config();

// Clean process.env from surrounding quotes (common issue in cloud panels)
for (const key of Object.keys(process.env)) {
  const value = process.env[key];
  if (typeof value === "string") {
    process.env[key] = value.trim().replace(/^["']|["']$/g, "");
  }
}

async function startServer() {
  validateCorsConfiguration();
  validateUploadStorageConfiguration();

  const app = createApp();
  const port = Number(process.env.PORT || 4000);
  const nodeEnv = process.env.NODE_ENV || "development";
  const allowedOrigins = parseAllowedOrigins();
  const uploadStorageMode = getUploadStorageMode();

  await testConnection();
  await migrateDatabase();

  const { initWebSocket } = require("./utils/websocket");

  const server = app.listen(port, () => {
    console.log(`QR Ordering backend listening on port ${port} (${nodeEnv}).`);
    console.log("Database connection OK.");
    console.log(
      allowedOrigins.length
        ? `Allowed frontend origins: ${allowedOrigins.join(", ")}`
        : "Allowed frontend origins: *"
    );
    console.log(`Upload storage mode: ${uploadStorageMode}`);
  });

  initWebSocket(server);
}

startServer().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
