const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createMessagesTable() {
  try {
    console.log('🚀 Creating messages table...\n');

    // Create messages table
    await pool.query(`
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
    console.log('✅ messages table created');

    // Create indexes for performance
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_match_id ON messages(match_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_match_created ON messages(match_id, created_at DESC)');
    console.log('✅ messages indexes created');

    console.log('\n🎉 Messages table created successfully!');

  } catch (error) {
    console.error('❌ Error creating messages table:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createMessagesTable();
