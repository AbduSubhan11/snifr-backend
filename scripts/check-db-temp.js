require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Current tables:', tables.rows.map(r => r.table_name));

    const checkTable = async (tableName) => {
      const columns = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [tableName]);
      console.log(`\nColumns for ${tableName}:`);
      console.table(columns.rows);
    };

    await checkTable('users');
    await checkTable('pets');
    await checkTable('messages');

    const parksCount = await pool.query("SELECT COUNT(*) FROM parks");
    console.log(`\nTotal parks seeded: ${parksCount.rows[0].count}`);

  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await pool.end();
  }
}

check();
