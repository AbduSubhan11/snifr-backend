const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('🗑️  Cleaning up test data...\n');
    
    // Delete test users (will cascade to pets, matches, messages)
    const result = await pool.query(`
      DELETE FROM users 
      WHERE email LIKE 'test_%@example.com'
      RETURNING id, email
    `, []);
    
    console.log(`✅ Deleted ${result.rows.length} users`);
    result.rows.forEach(row => {
      console.log(`   - ${row.email} (${row.id})`);
    });
    
    console.log('\n✅ Cleanup complete!');
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
