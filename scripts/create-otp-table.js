require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createOTPTable() {
  try {
    console.log('Creating OTP tokens table...\n');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS otp_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log('✅ Table: otp_tokens created');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_tokens_otp_code ON otp_tokens(otp_code)
    `);
    console.log('✅ Index: idx_otp_tokens_otp_code created');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_otp_tokens_user_id ON otp_tokens(user_id)
    `);
    console.log('✅ Index: idx_otp_tokens_user_id created');
    
    console.log('\n✅ OTP table setup completed successfully!\n');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createOTPTable();
