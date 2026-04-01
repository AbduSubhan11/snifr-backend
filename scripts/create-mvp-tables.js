const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createTables() {
  try {
    console.log('🚀 Creating matches and playdates tables...\n');

    // Create matches table
    await pool.query(`
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
    console.log('✅ matches table created');

    // Create indexes for matches
    await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_pet_1 ON matches(pet_1_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_pet_2 ON matches(pet_2_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_matched_at ON matches(matched_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_matches_pet_status ON matches(pet_1_id, status)');
    console.log('✅ matches indexes created');

    // Create playdates table
    await pool.query(`
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
    console.log('✅ playdates table created');

    // Create indexes for playdates
    await pool.query('CREATE INDEX IF NOT EXISTS idx_playdates_match_id ON playdates(match_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_playdates_pet_id ON playdates(pet_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_playdates_invited_pet ON playdates(invited_pet_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_playdates_status ON playdates(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_playdates_scheduled_date ON playdates(scheduled_date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_playdates_pet_status ON playdates(pet_id, status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_playdates_date_status ON playdates(scheduled_date, status)');
    console.log('✅ playdates indexes created');

    console.log('\n🎉 All tables created successfully!');
    
    // Verify tables
    const result = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📋 Tables in your database:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createTables();
