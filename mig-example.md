require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  let client;
  try {
    client = await pool.connect();

    // ── Compass leads table (separate from client's website_leads) ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS compass_leads (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        context VARCHAR(255),
        path TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_term TEXT,
        utm_content TEXT,
        email_sequence_started_at TIMESTAMP,
        email_sequence_enrolled BOOLEAN DEFAULT FALSE,
        email_1_sent BOOLEAN DEFAULT FALSE,
        email_2_sent BOOLEAN DEFAULT FALSE,
        email_3_sent BOOLEAN DEFAULT FALSE,
        email_4_sent BOOLEAN DEFAULT FALSE,
        email_5_sent BOOLEAN DEFAULT FALSE,
        replied_to_email_4 BOOLEAN DEFAULT FALSE,
        challenge_type VARCHAR(255),
        vltn_interest_click BOOLEAN DEFAULT FALSE,
        unsubscribed_at TIMESTAMP,
        blueprint_sent_at TIMESTAMP,
        blueprint_last_context VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compass_leads_email ON compass_leads(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compass_leads_enrolled ON compass_leads(email_sequence_enrolled)`);
    console.log('✅ compass_leads table ready');

    // ── Email opens tracking table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS compass_email_opens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        email_number INTEGER NOT NULL,
        opened_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compass_email_opens_email ON compass_email_opens(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compass_email_opens_opened ON compass_email_opens(opened_at)`);
    console.log('✅ compass_email_opens table ready');

    // ── Email clicks tracking table ──
    await client.query(`
      CREATE TABLE IF NOT EXISTS compass_email_clicks (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        link_type VARCHAR(100) NOT NULL,
        clicked_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compass_email_clicks_email ON compass_email_clicks(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compass_email_clicks_clicked ON compass_email_clicks(clicked_at)`);
    console.log('✅ compass_email_clicks table ready');

    console.log('\n🎉 All email sequence migrations complete!');
    console.log('✅ Client tables are NOT affected (only compass_* tables created)');

    // ── Add missing columns if compass_leads already exists ──
    const extraColumns = [
      ['blueprint_sent_at', 'TIMESTAMP'],
      ['blueprint_last_context', 'VARCHAR(255)']
    ];

    for (const [colName, colType] of extraColumns) {
      const checkResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'compass_leads' AND column_name = $1
        )
      `, [colName]);

      if (!checkResult.rows[0].exists) {
        await client.query(`ALTER TABLE compass_leads ADD COLUMN ${colName} ${colType}`);
        console.log(`✅ Added column: ${colName}`);
      } else {
        console.log(`✅ ${colName}: already exists`);
      }
    }

    console.log('\n🎉 Full migration complete!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runMigrations();
