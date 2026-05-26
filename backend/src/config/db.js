const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

let pool;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createPool() {
  return mysql.createPool({
    host: getRequiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 3306),
    database: getRequiredEnv("DB_NAME"),
    user: getRequiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD || "",
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    waitForConnections: true,
    queueLimit: 0,
    namedPlaceholders: true,
  });
}

function getPool() {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

async function query(sql, params = {}) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

async function testConnection() {
  const connection = await getPool().getConnection();

  try {
    await connection.ping();
  } finally {
    connection.release();
  }
}

async function closePool() {
  if (!pool) {
    return;
  }

  const currentPool = pool;
  pool = null;
  await currentPool.end();
}

module.exports = {
  getPool,
  query,
  testConnection,
  closePool,
};
