import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create a new pool using the Neon connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon DB
  },
});

export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
