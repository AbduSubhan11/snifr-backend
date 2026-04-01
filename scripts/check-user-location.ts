import { query } from '../src/config/db';

async function checkUserLocation() {
  try {
    console.log('🔍 Fetching all users...\n');
    
    // Fetch all users
    const allUsersResult = await query(`
      SELECT 
        id,
        email,
        full_name,
        phone,
        share_location,
        location_visibility,
        latitude,
        longitude,
        location_accuracy,
        location_updated_at,
        created_at,
        is_active
      FROM users
      ORDER BY created_at DESC
    `);
    
    console.log('📋 ALL USERS:');
    console.log('='.repeat(100));
    allUsersResult.rows.forEach((user: any, index: number) => {
      console.log(`\n${index + 1}. ${user.full_name || 'N/A'} (${user.email})`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Share Location: ${user.share_location ? '✅ YES' : '❌ NO'}`);
      console.log(`   Location Visibility: ${user.location_visibility || 'N/A'}`);
      console.log(`   Latitude: ${user.latitude || 'Not set'}`);
      console.log(`   Longitude: ${user.longitude || 'Not set'}`);
      console.log(`   Location Updated: ${user.location_updated_at || 'Never'}`);
      console.log(`   Active: ${user.is_active ? 'Yes' : 'No'}`);
    });
    
    console.log('\n' + '='.repeat(100));
    
    // Find test2@gmail.com
    console.log('\n🔍 Searching for test2@gmail.com...\n');
    
    const testUserResult = await query(
      `SELECT 
         id,
         email,
         full_name,
         share_location,
         location_visibility,
         latitude,
         longitude,
         location_updated_at
       FROM users 
       WHERE email = $1`,
      ['test2@gmail.com']
    );
    
    if (testUserResult.rows.length === 0) {
      console.log('❌ User test2@gmail.com NOT FOUND');
      return;
    }
    
    const user = testUserResult.rows[0];
    
    console.log('✅ User Found:');
    console.log('   Name:', user.full_name || 'N/A');
    console.log('   Email:', user.email);
    console.log('   ID:', user.id);
    console.log('   Share Location:', user.share_location ? '✅ YES' : '❌ NO');
    console.log('   Location Visibility:', user.location_visibility || 'N/A');
    console.log('   Latitude:', user.latitude || 'Not set');
    console.log('   Longitude:', user.longitude || 'Not set');
    console.log('   Location Updated:', user.location_updated_at || 'Never');
    
    // If location sharing is not enabled, enable it
    if (!user.share_location) {
      console.log('\n⚙️  Location sharing is DISABLED. Enabling now...');
      
      // Set default location (Karachi, Pakistan) if no location exists
      const defaultLat = user.latitude || 24.8607;
      const defaultLng = user.longitude || 67.0011;
      
      await query(
        `UPDATE users 
         SET share_location = $1,
             latitude = COALESCE(latitude, $2),
             longitude = COALESCE(longitude, $3),
             location_visibility = COALESCE(location_visibility, 'matches'),
             location_updated_at = NOW()
         WHERE id = $4`,
        [true, defaultLat, defaultLng, user.id]
      );
      
      console.log('✅ Location sharing ENABLED successfully!');
      console.log('   Default location set to: ', { latitude: defaultLat, longitude: defaultLng });
      
      // Verify the update
      const verifyResult = await query(
        `SELECT share_location, latitude, longitude, location_visibility, location_updated_at 
         FROM users 
         WHERE id = $1`,
        [user.id]
      );
      
      const updated = verifyResult.rows[0];
      console.log('\n✅ Verification:');
      console.log('   Share Location:', updated.share_location ? '✅ YES' : '❌ NO');
      console.log('   Latitude:', updated.latitude);
      console.log('   Longitude:', updated.longitude);
      console.log('   Visibility:', updated.location_visibility);
      console.log('   Updated At:', updated.location_updated_at);
    } else {
      console.log('\n✅ Location sharing is already ENABLED');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    // Close pool connections
    process.exit(0);
  }
}

checkUserLocation();
