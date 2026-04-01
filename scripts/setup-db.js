#!/usr/bin/env node
/**
 * Database Setup Script for Snifr Backend
 * 
 * This script initializes the Neon PostgreSQL database with the required tables.
 * 
 * Usage:
 *   npm run db:init
 *   or
 *   node scripts/setup-db.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function setupDatabase() {
  console.log('🔧 Starting database setup...\n');

  try {
    // Test connection
    console.log('📡 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connection successful!\n');

    // Read and execute the init SQL file
    console.log('📄 Reading database schema...');
    const sqlPath = path.join(__dirname, '..', 'database', 'init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('🚀 Executing database schema...\n');
    
    // Split SQL into individual statements (basic split by semicolon)
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      // Skip pure comment lines
      if (statement.startsWith('--') || statement.startsWith('COMMENT ON')) {
        continue;
      }
      
      try {
        await pool.query(statement);
        const firstLine = statement.split('\n')[0].substring(0, 50);
        console.log(`   ✅ ${firstLine}...`);
      } catch (err) {
        // Ignore "already exists" errors
        if (err.code === '42P07') { // duplicate_table
          console.log(`   ⚠️  Table already exists: ${firstLine}`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ Database setup completed successfully!');
    console.log('\n📋 Tables created:');
    console.log('   • users');
    console.log('   • password_reset_tokens');
    console.log('   • refresh_tokens');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase();
