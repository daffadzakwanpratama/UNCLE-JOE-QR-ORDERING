const { getPool, closePool } = require("../src/config/db");

async function main() {
  console.log("Dropping unused columns from menus table...");
  const pool = getPool();
  
  await pool.execute("ALTER TABLE menus DROP COLUMN IF EXISTS rating");
  console.log("rating column dropped.");
  
  await pool.execute("ALTER TABLE menus DROP COLUMN IF EXISTS reviews_count");
  console.log("reviews_count column dropped.");
  
  await pool.execute("ALTER TABLE menus DROP COLUMN IF EXISTS popularity_score");
  console.log("popularity_score column dropped.");
  
  console.log("Migration successful: Columns dropped.");
}

main()
  .then(() => closePool())
  .catch((err) => {
    console.error("Migration failed:", err);
    closePool();
    process.exit(1);
  });
