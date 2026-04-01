const { Pool } = require('pg');
require('dotenv').config();

// Create a new pool using the Neon connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon DB
  },
});

const query = (text, params) => {
  return pool.query(text, params);
};

module.exports = { pool, query };
