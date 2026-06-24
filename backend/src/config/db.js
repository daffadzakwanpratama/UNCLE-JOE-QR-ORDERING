const { Pool } = require("pg");
const dotenv = require("dotenv");

dotenv.config();

// Clean process.env from surrounding quotes (common issue in cloud panels)
for (const key of Object.keys(process.env)) {
  const value = process.env[key];
  if (typeof value === "string") {
    process.env[key] = value.trim().replace(/^["']|["']$/g, "");
  }
}

let poolInstance;
let wrappedPoolInstance;

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function createRawPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
      max: Number(process.env.DB_CONNECTION_LIMIT || 10),
    });
  }

  return new Pool({
    host: getRequiredEnv("DB_HOST"),
    port: Number(process.env.DB_PORT || 5432),
    database: getRequiredEnv("DB_NAME"),
    user: getRequiredEnv("DB_USER"),
    password: process.env.DB_PASSWORD || "",
    max: Number(process.env.DB_CONNECTION_LIMIT || 10),
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
}

// Kamus pemetaan casing otomatis dari PostgreSQL lowercase ke camelCase yang diharapkan aplikasi
const CASING_MAP = {
  imageurl: "imageUrl",
  reviewscount: "reviewsCount",
  popularityscore: "popularityScore",
  ispopular: "isPopular",
  categoryid: "categoryId",
  categoryname: "categoryName",
  createdat: "createdAt",
  updatedat: "updatedAt",
  ordernumber: "orderNumber",
  customername: "customerName",
  phonenumber: "phoneNumber",
  tablenumber: "tableNumber",
  paymentmethod: "paymentMethod",
  paymentstatus: "paymentStatus",
  paymenttoken: "paymentToken",
  servicefee: "serviceFee",
  taxamount: "taxAmount",
  discountamount: "discountAmount",
  baristanote: "baristaNote",
  itemsummary: "itemSummary",
  itemnotes: "itemNotes",
  discounttype: "discountType",
  discountvalue: "discountValue",
  minpurchase: "minPurchase",
  maxdiscount: "maxDiscount",
  usagelimit: "usageLimit",
  usedcount: "usedCount",
  startdate: "startDate",
  enddate: "endDate",
  isactive: "isActive",
  promocode: "promoCode",
  menuid: "menuId",
  menuname: "menuName",
  sizelabel: "sizeLabel",
  unitprice: "unitPrice",
  linetotal: "lineTotal",
  fullname: "fullName",
  pricetype: "priceType",
  pricehot: "priceHot",
  priceice: "priceIce",
};

function mapRowKeys(row) {
  if (!row || typeof row !== "object") {
    return row;
  }
  
  const mapped = {};
  for (const key of Object.keys(row)) {
    const mappedKey = CASING_MAP[key] || key;
    mapped[mappedKey] = row[key];
  }
  return mapped;
}

// Helper untuk mengubah parameter MySQL positional (?) ke PostgreSQL ($1, $2, dst.)
function convertPositionalPlaceholders(sql, params = []) {
  let index = 1;
  const pgSql = sql.replace(/\?/g, () => `$${index++}`);
  return { pgSql, pgParams: params };
}

// Helper untuk mengubah parameter MySQL named (:paramName) ke PostgreSQL ($1, $2, dst.)
function convertNamedPlaceholders(sql, params = {}) {
  let pgSql = sql;
  const pgParams = [];
  let index = 1;

  const matches = sql.match(/:[a-zA-Z0-9_]+/g) || [];
  const uniqueMatches = [...new Set(matches)].sort((a, b) => b.length - a.length);

  for (const match of uniqueMatches) {
    const paramName = match.substring(1);
    const paramValue = params[paramName];
    
    pgSql = pgSql.replaceAll(match, `$${index}`);
    pgParams.push(paramValue !== undefined ? paramValue : null);
    index++;
  }

  return { pgSql, pgParams };
}

// Fungsi eksekusi query dengan kompatibilitas MySQL
async function executePgQuery(clientOrPool, sql, params = []) {
  const sqlCleaned = sql.trim().toUpperCase();
  const isSelect = sqlCleaned.startsWith("SELECT") || sqlCleaned.startsWith("WITH");
  const isInsert = sqlCleaned.startsWith("INSERT");
  
  let pgSql = sql;
  let pgParams = [];

  if (Array.isArray(params)) {
    const converted = convertPositionalPlaceholders(sql, params);
    pgSql = converted.pgSql;
    pgParams = converted.pgParams;
  } else if (params && typeof params === "object") {
    const converted = convertNamedPlaceholders(sql, params);
    pgSql = converted.pgSql;
    pgParams = converted.pgParams;
  } else {
    pgParams = [];
  }

  if (isInsert && !pgSql.toUpperCase().includes("RETURNING")) {
    pgSql = pgSql + " RETURNING id";
  }

  const res = await clientOrPool.query(pgSql, pgParams);

  const affectedRows = res.rowCount || 0;
  const insertId = isInsert && res.rows && res.rows[0] ? Number(res.rows[0].id) : null;

  const result = {
    insertId,
    affectedRows,
    rowCount: affectedRows,
  };

  if (isSelect) {
    const mappedRows = res.rows ? res.rows.map(mapRowKeys) : [];
    return [mappedRows, null];
  } else {
    return [result, null];
  }
}

// Wrapper Koneksi Tunggal (Transaction Support)
class WrappedConnection {
  constructor(client) {
    this.client = client;
  }

  async execute(sql, params = []) {
    return executePgQuery(this.client, sql, params);
  }

  async query(sql, params = []) {
    const [rows] = await executePgQuery(this.client, sql, params);
    return rows;
  }

  async beginTransaction() {
    await this.client.query("BEGIN");
  }

  async commit() {
    await this.client.query("COMMIT");
  }

  async rollback() {
    await this.client.query("ROLLBACK");
  }

  async ping() {
    await this.client.query("SELECT 1");
  }

  release() {
    this.client.release();
  }
}

// Wrapper Pool Database
class WrappedPool {
  constructor(pool) {
    this.pool = pool;
  }

  async execute(sql, params = []) {
    return executePgQuery(this.pool, sql, params);
  }

  async query(sql, params = []) {
    const [rows] = await executePgQuery(this.pool, sql, params);
    return rows;
  }

  async getConnection() {
    const client = await this.pool.connect();
    return new WrappedConnection(client);
  }

  async end() {
    await this.pool.end();
  }
}

function getPool() {
  if (!poolInstance) {
    poolInstance = createRawPool();
    wrappedPoolInstance = new WrappedPool(poolInstance);
  }

  return wrappedPoolInstance;
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
  if (!poolInstance) {
    return;
  }

  const currentWrappedPool = wrappedPoolInstance;
  poolInstance = null;
  wrappedPoolInstance = null;
  await currentWrappedPool.end();
}

async function migrateDatabase() {
  try {
    // 1. Migrate menus table
    const columnsMenu = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
         AND table_name = 'menus' 
         AND column_name = 'is_popular'`
    );

    if (columnsMenu.length === 0) {
      console.log("Migrating database: Adding 'is_popular' column to 'menus' table...");
      await getPool().execute(
        `ALTER TABLE menus ADD COLUMN is_popular BOOLEAN NOT NULL DEFAULT FALSE`
      );
      console.log("Database migration successful: 'is_popular' column added.");
    }

    // 1b. Migrate menus table for price_type and variants
    const columnsMenuPriceType = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
         AND table_name = 'menus' 
         AND column_name = 'price_type'`
    );

    if (columnsMenuPriceType.length === 0) {
      console.log("Migrating database: Adding 'price_type', 'price_hot', and 'price_ice' columns to 'menus' table...");
      await getPool().execute(
        `ALTER TABLE menus 
         ADD COLUMN price_type VARCHAR(30) NOT NULL DEFAULT 'single',
         ADD COLUMN price_hot DECIMAL(12, 2) NULL,
         ADD COLUMN price_ice DECIMAL(12, 2) NULL`
      );
      console.log("Database migration successful: Price type and variant columns added.");
    }

    // 2. Migrate orders table for Midtrans payments
    const columnsPaymentStatus = await query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' 
         AND table_name = 'orders' 
         AND column_name = 'payment_status'`
    );

    if (columnsPaymentStatus.length === 0) {
      console.log("Migrating database: Adding 'payment_status' and 'payment_token' columns to 'orders' table...");
      await getPool().execute(
        `ALTER TABLE orders 
         ADD COLUMN payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
         ADD COLUMN payment_token VARCHAR(255) NULL`
      );
      console.log("Database migration successful: Payment columns added to 'orders' table.");
    }

    // 3. Migrate settings table
    const tableSettingsExists = await query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
         AND table_name = 'settings'`
    );

    if (tableSettingsExists.length === 0) {
      console.log("Migrating database: Creating 'settings' table...");
      await getPool().execute(
        `CREATE TABLE settings (
            key VARCHAR(50) PRIMARY KEY,
            value VARCHAR(255) NOT NULL,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
         )`
      );
      await getPool().execute(
        `INSERT INTO settings (key, value) VALUES 
         ('tax_percent', '10'),
         ('service_fee', '2000')`
      );
      console.log("Database migration successful: 'settings' table created and seeded.");
    }
  } catch (error) {
    console.error("Database migration failed:", error.message || error);
  }
}

module.exports = {
  getPool,
  query,
  testConnection,
  closePool,
  migrateDatabase,
};
