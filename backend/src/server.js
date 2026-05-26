const dotenv = require("dotenv");
const { createApp } = require("./app");
const { testConnection } = require("./config/db");
const { parseAllowedOrigins, validateCorsConfiguration } = require("./config/cors");
const {
  getUploadStorageMode,
  validateUploadStorageConfiguration,
} = require("./utils/uploadStorage");

dotenv.config();

async function startServer() {
  validateCorsConfiguration();
  validateUploadStorageConfiguration();

  const app = createApp();
  const port = Number(process.env.PORT || 4000);
  const nodeEnv = process.env.NODE_ENV || "development";
  const allowedOrigins = parseAllowedOrigins();
  const uploadStorageMode = getUploadStorageMode();

  await testConnection();

  app.listen(port, () => {
    console.log(`QR Ordering backend listening on port ${port} (${nodeEnv}).`);
    console.log("Database connection OK.");
    console.log(
      allowedOrigins.length
        ? `Allowed frontend origins: ${allowedOrigins.join(", ")}`
        : "Allowed frontend origins: *"
    );
    console.log(`Upload storage mode: ${uploadStorageMode}`);
  });
}

startServer().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
