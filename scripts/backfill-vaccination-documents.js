/**
 * Backfill vaccination document URLs from verification_requests to pets table
 * Run this once to populate existing data
 */

const { Pool } = require('pg');
require('dotenv').config();

async function backfill() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🔄 Backfilling vaccination document URLs...\n');

    // Get all approved vaccination documents from verification_requests
    const query = `
      SELECT DISTINCT ON (pet_id) 
        pet_id,
        document_url,
        document_public_id
      FROM verification_requests
      WHERE status = 'approved'
      ORDER BY pet_id, created_at DESC
    `;

    const result = await pool.query(query);
    console.log(`📋 Found ${result.rows.length} pets with approved verification requests\n`);

    // Update each pet
    let updated = 0;
    for (const row of result.rows) {
      const updateQuery = `
        UPDATE pets 
        SET 
          vaccination_document_url = $1,
          vaccination_document_public_id = $2,
          vaccination_status = TRUE,
          updated_at = NOW()
        WHERE id = $3
      `;
      
      await pool.query(updateQuery, [
        row.document_url,
        row.document_public_id,
        row.pet_id
      ]);
      
      updated++;
      console.log(`✅ Updated pet: ${row.pet_id}`);
    }

    console.log(`\n✨ Backfill complete! Updated ${updated} pets.\n`);

  } catch (error) {
    console.error('❌ Backfill error:', error.message);
  } finally {
    await pool.end();
  }
}

backfill();
