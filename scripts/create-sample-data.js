const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createSampleData() {
  try {
    console.log('🚀 Creating sample test data...\n');

    // First, check if we have a test user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      ['test@snifr.com']
    );

    let userId;
    
    if (userResult.rows.length === 0) {
      // Create a test user
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('test123', 10);
      
      const newUser = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, phone) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        ['test@snifr.com', passwordHash, 'Test User', '1234567890']
      );
      userId = newUser.rows[0].id;
      console.log('✅ Created test user: test@snifr.com (password: test123)');
    } else {
      userId = userResult.rows[0].id;
      console.log('✅ Using existing test user');
    }

    // Sample pets data
    const samplePets = [
      {
        name: 'Buddy',
        breed: 'Golden Retriever',
        age: 3,
        gender: 'Male',
        species: 'Dog',
        temperament: 'Friendly, playful, energetic',
        energy_level: 'High',
        bio: 'Loves playing fetch and meeting new friends at the park!',
        color: 'Golden',
      },
      {
        name: 'Luna',
        breed: 'Labrador',
        age: 2,
        gender: 'Female',
        species: 'Dog',
        temperament: 'Gentle, intelligent, friendly',
        energy_level: 'Medium',
        bio: 'Sweet and calm, loves cuddles and long walks',
        color: 'Black',
      },
      {
        name: 'Max',
        breed: 'German Shepherd',
        age: 4,
        gender: 'Male',
        species: 'Dog',
        temperament: 'Loyal, confident, courageous',
        energy_level: 'High',
        bio: 'Well-trained and great with other dogs',
        color: 'Black and Tan',
      },
      {
        name: 'Bella',
        breed: 'Persian',
        age: 2,
        gender: 'Female',
        species: 'Cat',
        temperament: 'Calm, affectionate, quiet',
        energy_level: 'Low',
        bio: 'Loves sunny spots and gentle pets',
        color: 'White',
      },
      {
        name: 'Charlie',
        breed: 'Husky',
        age: 3,
        gender: 'Male',
        species: 'Dog',
        temperament: 'Outgoing, mischievous, loyal',
        energy_level: 'High',
        bio: 'Very active, needs lots of exercise and play',
        color: 'Gray and White',
      },
      {
        name: 'Lily',
        breed: 'Siamese',
        age: 1,
        gender: 'Female',
        species: 'Cat',
        temperament: 'Social, intelligent, vocal',
        energy_level: 'Medium',
        bio: 'Loves attention and interactive play',
        color: 'Cream and Brown',
      },
    ];

    // Insert sample pets
    for (const pet of samplePets) {
      const existingPet = await pool.query(
        'SELECT id FROM pets WHERE user_id = $1 AND name = $2',
        [userId, pet.name]
      );

      if (existingPet.rows.length === 0) {
        await pool.query(
          `INSERT INTO pets (user_id, name, breed, age, gender, species, temperament, energy_level, bio, color)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [userId, pet.name, pet.breed, pet.age, pet.gender, pet.species, 
           pet.temperament, pet.energy_level, pet.bio, pet.color]
        );
        console.log(`✅ Created pet: ${pet.name} (${pet.breed})`);
      } else {
        console.log(`⏭️  Skipped existing pet: ${pet.name}`);
      }
    }

    console.log('\n🎉 Sample data created successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Email: test@snifr.com');
    console.log('   Password: test123');
    console.log('\n⚠️  Note: To test swipe matching, you need to:');
    console.log('   1. Create a NEW user account');
    console.log('   2. Create a pet for that user');
    console.log('   3. Login with the new account and swipe');
    console.log('   4. You will see the sample pets created above\n');

  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createSampleData();
