const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('🗑️  Cleaning up duplicate messages in database...\n');
    
    // Check for duplicates first
    const duplicates = await pool.query(`
      SELECT id, COUNT(*) as count
      FROM messages
      GROUP BY id
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log(`Found ${duplicates.rows.length} duplicate message IDs:\n`);
      duplicates.rows.forEach(row => {
        console.log(`  - ${row.id}: ${row.count} copies`);
      });
      
      // Delete duplicates, keep only one copy of each
      const deleteResult = await pool.query(`
        DELETE FROM messages
        WHERE ctid NOT IN (
          SELECT MIN(ctid)
          FROM messages
          GROUP BY id
        )
        RETURNING id
      `);
      
      console.log(`\n✅ Deleted ${deleteResult.rows.length} duplicate messages`);
    } else {
      console.log('✅ No duplicates found in database!');
    }
    
    // Verify clean
    const verify = await pool.query(`
      SELECT COUNT(*) as total, COUNT(DISTINCT id) as unique_count
      FROM messages
    `);
    
    console.log(`\n📊 Database status:`);
    console.log(`   Total rows: ${verify.rows[0].total}`);
    console.log(`   Unique messages: ${verify.rows[0].unique_count}`);
    
    if (verify.rows[0].total === verify.rows[0].unique_count) {
      console.log('\n✅ Database is clean! No duplicates.');
    } else {
      console.log(`\n⚠️  Still have ${verify.rows[0].total - verify.rows[0].unique_count} duplicates`);
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
