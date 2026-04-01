require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTestToken() {
  try {
    // Get the test user
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', ['test@test.com']);
    if (userResult.rows.length === 0) {
      console.log('No test user found');
      return;
    }
    const userId = userResult.rows[0].id;
    
    // Create reset token
    const token = 'test-reset-token-12345';
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token) DO UPDATE SET expires_at = $3, used = FALSE',
      [userId, token, expiresAt]
    );
    
    console.log('✅ Test reset token created:');
    console.log(`   Token: ${token}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

createTestToken();
