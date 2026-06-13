const dotenv = require("dotenv");
const { createApp } = require("./src/app");
const { testConnection, migrateDatabase } = require("./src/config/db");

dotenv.config();

// Clean process.env from surrounding quotes (common issue in cloud panels)
for (const key of Object.keys(process.env)) {
  const value = process.env[key];
  if (typeof value === "string") {
    process.env[key] = value.trim().replace(/^["']|["']$/g, "");
  }
}

if (process.env.VERCEL) {
  const app = createApp();
  // Run database connection check and migrations
  testConnection().catch(console.error);
  migrateDatabase().catch(console.error);
  module.exports = app;
} else {
  require("./src/server");
}
