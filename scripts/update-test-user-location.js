const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function updateTestUserLocation() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Finding test user...\n');
    
    // Find the test user
    const userResult = await client.query(
      `SELECT id, email, full_name, share_location, location_visibility, latitude, longitude
       FROM users
       WHERE email = 'test@test.com'`
    );
    
    if (userResult.rows.length === 0) {
      console.log('❌ Test user (test@test.com) not found in database!');
      console.log('Please create the user first by signing up in the app.\n');
      return;
    }
    
    const user = userResult.rows[0];
    
    console.log('📊 Current User Status:');
    console.log('─'.repeat(60));
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.full_name}`);
    console.log(`Share Location: ${user.share_location}`);
    console.log(`Location Visibility: ${user.location_visibility}`);
    console.log(`Latitude: ${user.latitude || 'NULL'}`);
    console.log(`Longitude: ${user.longitude || 'NULL'}`);
    console.log('─'.repeat(60));
    
    // Update user to enable location sharing
    console.log('\n🔄 Updating user to enable location sharing...\n');
    
    const updateResult = await client.query(
      `UPDATE users
       SET share_location = TRUE,
           location_visibility = 'everyone',
           latitude = 33.6844,  -- Lake View Park, Islamabad
           longitude = 73.0594,
           location_updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [user.id]
    );
    
    const updatedUser = updateResult.rows[0];
    
    console.log('✅ User updated successfully!\n');
    console.log('📊 New Status:');
    console.log('─'.repeat(60));
    console.log(`Share Location: ${updatedUser.share_location}`);
    console.log(`Location Visibility: ${updatedUser.location_visibility}`);
    console.log(`Latitude: ${updatedUser.latitude}`);
    console.log(`Longitude: ${updatedUser.longitude}`);
    console.log(`Location Updated: ${updatedUser.location_updated_at}`);
    console.log('─'.repeat(60));
    
    console.log('\n✨ Test user can now be found in nearby pets!\n');
    console.log('📍 Location set to: Lake View Park, Islamabad');
    console.log('👁️  Visibility: Everyone (all users can see)');
    console.log('✅ Share Location: Enabled\n');
    
  } catch (error) {
    console.error('\n❌ Error updating user:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateTestUserLocation();
