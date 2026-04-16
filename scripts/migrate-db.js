require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting database migration...');

    // 1. Enable Extensions
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    console.log('✅ Extensions enabled');

    // 2. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        avatar_url VARCHAR(500),
        email_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        is_admin BOOLEAN DEFAULT FALSE,
        share_location BOOLEAN DEFAULT FALSE,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        location_accuracy DECIMAL(5, 2),
        location_updated_at TIMESTAMP WITH TIME ZONE,
        location_visibility VARCHAR(50) DEFAULT 'matches' CHECK (location_visibility IN ('everyone', 'matches', 'none')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_login_at TIMESTAMP WITH TIME ZONE
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude) WHERE share_location = TRUE AND is_active = TRUE');
    console.log('✅ Users table ready');

    // 3. Password Reset Tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)');
    console.log('✅ Password Reset Tokens table ready');

    // 4. Refresh Tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        revoked_at TIMESTAMP WITH TIME ZONE
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)');
    console.log('✅ Refresh Tokens table ready');

    // 5. OTP Tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        otp_code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        attempts INTEGER DEFAULT 0,
        max_attempts INTEGER DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_otp_tokens_otp_code ON otp_tokens(otp_code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_otp_tokens_user_id ON otp_tokens(user_id)');
    console.log('✅ OTP Tokens table ready');

    // 6. Pets Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
        photo_url VARCHAR(500),
        photo_public_id VARCHAR(255),
        vaccination_document_url VARCHAR(500),
        vaccination_document_public_id VARCHAR(255),
        is_verified BOOLEAN DEFAULT FALSE,
        vaccination_status BOOLEAN DEFAULT FALSE,
        compatibility_score INTEGER DEFAULT 50,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_pets_user_id ON pets(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pets_species ON pets(species)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pets_breed ON pets(breed)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pets_age ON pets(age)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pets_gender ON pets(gender)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pets_energy_level ON pets(energy_level)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pets_is_active ON pets(is_active)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pets_user_active ON pets(user_id, is_active)');
    console.log('✅ Pets table ready');

    // 7. Matches Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_1_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        pet_2_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        pet_1_liked BOOLEAN DEFAULT FALSE,
        pet_2_liked BOOLEAN DEFAULT FALSE,
        pet_1_disliked BOOLEAN DEFAULT FALSE,
        pet_2_disliked BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'rejected', 'unmatched')),
        liked_at TIMESTAMP WITH TIME ZONE,
        matched_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT unique_pet_pair UNIQUE (pet_1_id, pet_2_id)
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_matches_pet_1 ON matches(pet_1_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_matches_pet_2 ON matches(pet_2_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_matches_pet_status ON matches(pet_1_id, status)');
    console.log('✅ Matches table ready');

    // 8. Playdates Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS playdates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        invited_pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        location_name VARCHAR(200) NOT NULL,
        location_address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        scheduled_date DATE NOT NULL,
        scheduled_time TIME NOT NULL,
        duration_minutes INTEGER DEFAULT 60,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
        message TEXT,
        declined_reason VARCHAR(255),
        invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        responded_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        cancelled_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_playdates_match_id ON playdates(match_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_playdates_pet_id ON playdates(pet_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_playdates_invited_pet ON playdates(invited_pet_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_playdates_status ON playdates(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_playdates_scheduled_date ON playdates(scheduled_date)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_playdates_pet_status ON playdates(pet_id, status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_playdates_date_status ON playdates(scheduled_date, status)');
    console.log('✅ Playdates table ready');

    // 9. Parks Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS parks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        city VARCHAR(100) DEFAULT 'Islamabad',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_parks_city ON parks(city)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_parks_location ON parks(latitude, longitude)');
    console.log('✅ Parks table ready');

    // 10. Verification Requests Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_url VARCHAR(500) NOT NULL,
        document_public_id VARCHAR(255) NOT NULL,
        document_type VARCHAR(50) NOT NULL DEFAULT 'vaccination_certificate' 
          CHECK (document_type IN ('vaccination_certificate', 'vet_certificate', 'medical_record')),
        notes TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' 
          CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        rejection_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_verification_pet_id ON verification_requests(pet_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_verification_user_id ON verification_requests(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_requests(status)');
    console.log('✅ Verification Requests table ready');

    // 11. Messages Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_text TEXT,
        image_url VARCHAR(500),
        image_public_id VARCHAR(255),
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT message_content_check CHECK (
          (message_text IS NOT NULL AND message_text != '') 
          OR (image_url IS NOT NULL AND image_url != '')
        )
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_messages_match_created ON messages(match_id, created_at DESC)');
    console.log('✅ Messages table ready');

    // 12. Waiting List Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS waiting_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'subscribed',
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_waiting_list_email ON waiting_list(email)');
    console.log('✅ Waiting List table ready');

    // 13. Add missing columns to existing tables (for incremental updates)
    const incrementalUpdates = [
      {
        table: 'users',
        columns: [
          ['is_admin', 'BOOLEAN DEFAULT FALSE'],
          ['share_location', 'BOOLEAN DEFAULT FALSE'],
          ['latitude', 'DECIMAL(10, 8)'],
          ['longitude', 'DECIMAL(11, 8)'],
          ['location_accuracy', 'DECIMAL(5, 2)'],
          ['location_updated_at', 'TIMESTAMP WITH TIME ZONE'],
          ['location_visibility', "VARCHAR(50) DEFAULT 'matches' CHECK (location_visibility IN ('everyone', 'matches', 'none'))"]
        ]
      },
      {
        table: 'pets',
        columns: [
          ['vaccination_document_url', 'VARCHAR(500)'],
          ['vaccination_document_public_id', 'VARCHAR(255)']
        ]
      }
    ];

    for (const update of incrementalUpdates) {
      for (const [colName, colType] of update.columns) {
        const checkResult = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = $1 AND column_name = $2
          )
        `, [update.table, colName]);

        if (!checkResult.rows[0].exists) {
          await client.query(`ALTER TABLE ${update.table} ADD COLUMN ${colName} ${colType}`);
          console.log(`✅ Added column ${colName} to ${update.table}`);
        }
      }
    }

    // 12. Seed data if needed (e.g., Parks)
    await client.query(`
      INSERT INTO parks (name, address, latitude, longitude) VALUES
      ('F9 Park', 'F-9 Markaz, Islamabad', 33.7294, 73.0386),
      ('Lake View Park', 'Expressway, Islamabad', 33.6844, 73.0594),
      ('Margalla Trail 3', 'Margalla Hills, Islamabad', 33.7361, 73.0619),
      ('DHA Phase 2 Dog Park', 'DHA Phase 2, Islamabad', 33.6428, 73.0478),
      ('Fatima Jinnah Park', 'F-9, Islamabad', 33.7308, 73.0400),
      ('Rose Garden Park', 'F-9, Islamabad', 33.7250, 73.0450)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Seed data for Parks inserted');

    console.log('\n🎉 Full migration complete! Database is up to date.');

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
