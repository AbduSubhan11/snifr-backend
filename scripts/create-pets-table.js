const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const createPetsTable = async () => {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating pets table...\n');
    
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ UUID extension enabled');
    
    // Create pets table
    const petsTableQuery = `
      CREATE TABLE IF NOT EXISTS pets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        breed VARCHAR(100) NOT NULL,
        age INTEGER NOT NULL,
        gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female')),
        species VARCHAR(50) NOT NULL DEFAULT 'Dog' CHECK (species IN ('Dog', 'Cat')),
        temperament VARCHAR(255),
        energy_level VARCHAR(50) CHECK (energy_level IN ('Low', 'Medium', 'High')),
        weight DECIMAL(5,2),
        color VARCHAR(50),
        bio TEXT,
        photos TEXT[],
        is_verified BOOLEAN DEFAULT FALSE,
        vaccination_status BOOLEAN DEFAULT FALSE,
        compatibility_score INTEGER DEFAULT 50,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    
    await client.query(petsTableQuery);
    console.log('✅ Pets table created');
    
    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species)',
      'CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed)',
      'CREATE INDEX IF NOT EXISTS idx_pets_age ON pets(age)',
      'CREATE INDEX IF NOT EXISTS idx_pets_gender ON pets(gender)',
      'CREATE INDEX IF NOT EXISTS idx_pets_energy_level ON pets(energy_level)',
      'CREATE INDEX IF NOT EXISTS idx_pets_is_active ON pets(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_pets_user_active ON pets(user_id, is_active)'
    ];
    
    for (const index of indexes) {
      await client.query(index);
    }
    console.log('✅ Indexes created');
    
    // Add comments
    await client.query(`COMMENT ON TABLE pets IS 'Stores pet profiles for users (dogs and cats)'`);
    await client.query(`COMMENT ON COLUMN pets.compatibility_score IS 'AI-based compatibility score for matching with other pets'`);
    await client.query(`COMMENT ON COLUMN pets.is_verified IS 'Indicates if pet has verified vaccination/vet proof'`);
    console.log('✅ Comments added');
    
    console.log('\n✅ Pets table created successfully!\n');
    
  } catch (error) {
    console.error('❌ Error creating pets table:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

createPetsTable();
