/**
 * Migration script to create verification requests table
 * Run with: node scripts/migrate-verification.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting verification requests migration...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'verification-requests-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL
    await client.query(sql);
    
    console.log('✅ Verification requests table created successfully!\n');

    // Make user admin
    const adminEmail = 'ranasubhanrajput6677@gmail.com';
    console.log(`👤 Setting ${adminEmail} as admin...`);

    const updateResult = await client.query(
      `UPDATE users SET is_admin = TRUE WHERE email = $1`,
      [adminEmail]
    );

    if (updateResult.rowCount === 0) {
      console.log(`⚠️  No user found with email ${adminEmail}`);
      console.log('   You can run this update manually after creating your account:\n');
      console.log(`   UPDATE users SET is_admin = TRUE WHERE email = '${adminEmail}';\n`);
    } else {
      console.log(`✅ User ${adminEmail} is now an admin!\n`);
    }

    // Verify the table exists
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_requests'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Verification Requests Table Schema:');
    console.log('─'.repeat(60));
    verifyResult.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(15)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('─'.repeat(60));

    console.log('\n✨ Migration completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
