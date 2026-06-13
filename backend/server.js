const dotenv = require("dotenv");
const { createApp } = require("./src/app");
const { testConnection, migrateDatabase } = require("./src/config/db");

dotenv.config();

if (process.env.VERCEL) {
  const app = createApp();
  // Run database connection check and migrations
  testConnection().catch(console.error);
  migrateDatabase().catch(console.error);
  module.exports = app;
} else {
  require("./src/server");
}
