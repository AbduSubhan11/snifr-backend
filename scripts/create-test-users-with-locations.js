const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createTestUsersWithLocations() {
  const client = await pool.connect();

  try {
    console.log('🚀 Creating test users with location data...\n');

    // Test users to create
    const testUsers = [
      {
        email: 'user1@snifr.com',
        password: 'password123',
        fullName: 'John Doe',
        phone: '1234567890',
        latitude: 33.6844,  // Lake View Park, Islamabad
        longitude: 73.0594,
        petName: 'Buddy',
        petBreed: 'Golden Retriever',
        petSpecies: 'Dog',
        petAge: 3,
        petGender: 'Male',
      },
      {
        email: 'user2@snifr.com',
        password: 'password123',
        fullName: 'Sarah Smith',
        phone: '0987654321',
        latitude: 33.6900,  // Near Lake View Park
        longitude: 73.0700,
        petName: 'Luna',
        petBreed: 'Labrador',
        petSpecies: 'Dog',
        petAge: 2,
        petGender: 'Female',
      },
      {
        email: 'user3@snifr.com',
        password: 'password123',
        fullName: 'Mike Johnson',
        phone: '1122334455',
        latitude: 33.6750,  // Another nearby location
        longitude: 73.0500,
        petName: 'Max',
        petBreed: 'German Shepherd',
        petSpecies: 'Dog',
        petAge: 4,
        petGender: 'Male',
      },
    ];

    for (const userData of testUsers) {
      console.log(`\n📋 Processing: ${userData.email}`);
      console.log('─'.repeat(60));

      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email]
      );

      let userId;

      if (existingUser.rows.length === 0) {
        // Create new user
        const passwordHash = await bcrypt.hash(userData.password, 10);
        
        const newUser = await client.query(
          `INSERT INTO users (email, password_hash, full_name, phone, share_location, location_visibility, latitude, longitude, location_updated_at)
           VALUES ($1, $2, $3, $4, TRUE, 'everyone', $5, $6, NOW())
           RETURNING id, full_name`,
          [userData.email, passwordHash, userData.fullName, userData.phone, userData.latitude, userData.longitude]
        );
        
        userId = newUser.rows[0].id;
        console.log(`✅ Created user: ${newUser.rows[0].full_name}`);
      } else {
        userId = existingUser.rows[0].id;
        console.log(`⏭️  User already exists`);
        
        // Update location
        await client.query(
          `UPDATE users
           SET share_location = TRUE,
               location_visibility = 'everyone',
               latitude = $1,
               longitude = $2,
               location_updated_at = NOW()
           WHERE id = $3`,
          [userData.latitude, userData.longitude, userId]
        );
        console.log(`✅ Updated location`);
      }

      // Check if pet exists
      const existingPet = await client.query(
        'SELECT id FROM pets WHERE user_id = $1 AND name = $2',
        [userId, userData.petName]
      );

      if (existingPet.rows.length === 0) {
        // Create pet
        await client.query(
          `INSERT INTO pets (user_id, name, breed, age, gender, species, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
          [userId, userData.petName, userData.petBreed, userData.petAge, userData.petGender, userData.petSpecies]
        );
        console.log(`✅ Created pet: ${userData.petName} (${userData.petBreed})`);
      } else {
        console.log(`⏭️  Pet already exists: ${userData.petName}`);
      }

      console.log(`📍 Location: ${userData.latitude}, ${userData.longitude}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ All test users created successfully!\n');
    console.log('📝 Login Credentials:');
    console.log('   Email: user1@snifr.com  |  Password: password123');
    console.log('   Email: user2@snifr.com  |  Password: password123');
    console.log('   Email: user3@snifr.com  |  Password: password123\n');
    console.log('🗺️  All users have location sharing ENABLED');
    console.log('👁️  Visibility: EVERYONE (visible in nearby pets)\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUsersWithLocations();
