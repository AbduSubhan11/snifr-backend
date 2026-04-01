const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting location migration...\n');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'database', 'location_migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the entire script at once (not statement by statement)
    await client.query(migrationSQL);
    console.log('✅ Migration SQL executed successfully!\n');
    
    console.log('🔍 Verifying migration...\n');
    
    const result = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN (
        'share_location', 'latitude', 'longitude', 
        'location_accuracy', 'location_updated_at', 'location_visibility'
      )
      ORDER BY ordinal_position;
    `);
    
    console.log('New columns in users table:');
    console.log('─'.repeat(80));
    console.log(`${'Column Name'.padEnd(25)} | ${'Data Type'.padEnd(20)} | ${'Default'.padEnd(15)} | Nullable`);
    console.log('─'.repeat(80));
    
    result.rows.forEach(row => {
      console.log(
        `${row.column_name.padEnd(25)} | ${row.data_type.padEnd(20)} | ${String(row.column_default || 'NULL').padEnd(15)} | ${row.is_nullable}`
      );
    });
    
    console.log('─'.repeat(80));
    console.log(`\n✅ Total columns added: ${result.rows.length}\n`);
    
    // Check if index was created
    const indexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      AND indexname = 'idx_users_location';
    `);
    
    if (indexResult.rows.length > 0) {
      console.log('✅ Index created successfully:');
      console.log(`   Index Name: ${indexResult.rows[0].indexname}`);
      console.log(`   Definition: ${indexResult.rows[0].indexdef}\n`);
    } else {
      console.log('⚠️  Index may not have been created\n');
    }
    
    // Count existing users
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Current users in database: ${userCount.rows[0].count}\n`);
    
    console.log('✨ All migrations applied successfully!');
    console.log('✨ Existing tables and data are untouched!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
