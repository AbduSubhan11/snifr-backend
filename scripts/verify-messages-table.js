const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('🔍 Verifying messages table...\n');
    
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Messages table columns:');
    res.rows.forEach(row => {
      console.log(`   ${row.column_name} - ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'})`);
    });
    
    // Check indexes
    const indexes = await pool.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'messages'
    `);
    
    console.log('\n📊 Indexes:');
    indexes.rows.forEach(row => {
      console.log(`   ${row.indexname}`);
    });
    
    // Count rows
    const count = await pool.query('SELECT COUNT(*) FROM messages');
    console.log(`\n📈 Total messages: ${count.rows[0].count}`);
    
    console.log('\n✅ Messages table verified successfully!');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
