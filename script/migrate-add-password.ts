import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    const result = await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
    `);
    console.log("✅ Migration applied successfully");
    console.log(result);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
