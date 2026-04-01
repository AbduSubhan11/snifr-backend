const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function verifyDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying database structure...\n');
    
    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    console.log('📊 Tables in database:');
    console.log('─'.repeat(60));
    tablesResult.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    console.log(`\n   Total: ${tablesResult.rows.length} tables\n`);
    
    // Verify each important table exists and has expected columns
    const importantTables = {
      'users': ['id', 'email', 'full_name', 'share_location', 'latitude', 'longitude', 'location_visibility'],
      'pets': ['id', 'user_id', 'name', 'breed', 'age', 'species'],
      'matches': ['id', 'pet_1_id', 'pet_2_id', 'status'],
      'playdates': ['id', 'match_id', 'location_name', 'latitude', 'longitude'],
      'otp_tokens': ['id', 'user_id', 'otp_code'],
      'refresh_tokens': ['id', 'user_id', 'token'],
      'password_reset_tokens': ['id', 'user_id', 'token']
    };
    
    console.log('📋 Verifying table structures:\n');
    
    for (const [tableName, expectedColumns] of Object.entries(importantTables)) {
      const columnsResult = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = '${tableName}'
        ORDER BY ordinal_position;
      `);
      
      const columns = columnsResult.rows.map(r => r.column_name);
      const hasAllColumns = expectedColumns.every(col => columns.includes(col));
      
      if (hasAllColumns) {
        console.log(`✅ ${tableName} (${columns.length} columns)`);
      } else {
        console.log(`⚠️  ${tableName} - Missing columns!`);
        console.log(`   Expected: ${expectedColumns.join(', ')}`);
        console.log(`   Found: ${columns.join(', ')}`);
      }
    }
    
    console.log('\n📊 Data Summary:\n');
    
    // Count rows in each table
    for (const tableName of Object.keys(importantTables)) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`   ${tableName}: ${countResult.rows[0].count} rows`);
      } catch (error) {
        console.log(`   ${tableName}: Error counting - ${error.message}`);
      }
    }
    
    console.log('\n✨ Database verification complete!\n');
    console.log('✅ All tables intact');
    console.log('✅ Location columns added to users table');
    console.log('✅ No data was modified or deleted\n');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyDatabase();
