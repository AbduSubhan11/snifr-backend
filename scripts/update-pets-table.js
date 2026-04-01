const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const updatePetsTable = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Updating pets table for single photo...\n');
    
    // Step 1: Add new columns
    console.log('📝 Adding new columns...');
    await client.query(`
      ALTER TABLE pets 
      ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS photo_public_id VARCHAR(255)
    `);
    console.log('✅ New columns added');
    
    // Step 2: Migrate existing data (take first photo from array if exists)
    console.log('📝 Migrating existing photo data...');
    await client.query(`
      UPDATE pets 
      SET 
        photo_url = CASE 
          WHEN photos IS NOT NULL AND array_length(photos, 1) > 0 
          THEN photos[1] 
          ELSE NULL 
        END
      WHERE photos IS NOT NULL
    `);
    console.log('✅ Existing photo data migrated');
    
    // Step 3: Drop old photos column
    console.log('📝 Dropping old photos array column...');
    await client.query(`
      ALTER TABLE pets DROP COLUMN IF EXISTS photos
    `);
    console.log('✅ Old photos column dropped');
    
    // Step 4: Add comments
    await client.query(`COMMENT ON COLUMN pets.photo_url IS 'Single pet photo URL (Cloudinary)'`);
    await client.query(`COMMENT ON COLUMN pets.photo_public_id IS 'Cloudinary public ID for photo deletion'`);
    console.log('✅ Comments added');
    
    console.log('\n✅ Pets table updated successfully!\n');
    console.log('📊 Changes:');
    console.log('   - Removed: photos (TEXT[])');
    console.log('   - Added: photo_url (VARCHAR(500))');
    console.log('   - Added: photo_public_id (VARCHAR(255))');
    console.log('   - Each pet can now have ONLY 1 photo\n');
    
  } catch (error) {
    console.error('❌ Error updating pets table:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

updatePetsTable();
