const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkPets() {
  try {
    console.log('📊 Checking pets in database...\n');
    
    const result = await pool.query(`
      SELECT id, name, breed, photo_url, photo_public_id, created_at 
      FROM pets 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('Pets in Database:');
    console.log('='.repeat(80));
    result.rows.forEach((pet, i) => {
      console.log(`\n${i + 1}. ${pet.name} (${pet.breed})`);
      console.log(`   ID: ${pet.id}`);
      console.log(`   Photo URL: ${pet.photo_url || '❌ NULL'}`);
      console.log(`   Photo Public ID: ${pet.photo_public_id || '❌ NULL'}`);
      console.log(`   Created: ${pet.created_at}`);
    });
    console.log('\n' + '='.repeat(80));
    
    const petsWithPhotos = result.rows.filter(p => p.photo_url !== null);
    const petsWithoutPhotos = result.rows.filter(p => p.photo_url === null);
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total pets: ${result.rows.length}`);
    console.log(`   With photos: ✅ ${petsWithPhotos.length}`);
    console.log(`   Without photos: ❌ ${petsWithoutPhotos.length}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPets();
