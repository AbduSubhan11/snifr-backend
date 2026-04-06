const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    console.log('🔍 Checking matches...\n');
    
    const matches = await pool.query(`
      SELECT 
        m.id,
        m.status,
        m.pet_1_liked,
        m.pet_2_liked,
        p1.name as pet1_name,
        p2.name as pet2_name,
        u1.full_name as owner1,
        u2.full_name as owner2
      FROM matches m
      JOIN pets p1 ON m.pet_1_id = p1.id
      JOIN pets p2 ON m.pet_2_id = p2.id
      JOIN users u1 ON p1.user_id = u1.id
      JOIN users u2 ON p2.user_id = u2.id
      ORDER BY m.created_at DESC
      LIMIT 5
    `);
    
    console.log(`Found ${matches.rows.length} matches:`);
    matches.rows.forEach(row => {
      console.log(`\n  ID: ${row.id}`);
      console.log(`  Status: ${row.status}`);
      console.log(`  Pet 1: ${row.pet1_name} (Owner: ${row.owner1}) - Liked: ${row.pet_1_liked}`);
      console.log(`  Pet 2: ${row.pet2_name} (Owner: ${row.owner2}) - Liked: ${row.pet_2_liked}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
