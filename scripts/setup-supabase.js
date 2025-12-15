/**
 * Supabase Database Setup Script
 * Run with: node scripts/setup-supabase.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://dsmdouamcbaizcsobngq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runMigration() {
  console.log('🚀 Setting up Supabase database for Agent Forge...\n');

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration SQL loaded');
  console.log('📡 Connecting to Supabase...\n');

  // Split into individual statements (simple split, works for our case)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);
  console.log('⚠️  IMPORTANT: Run this SQL directly in Supabase SQL Editor:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/dsmdouamcbaizcsobngq/sql');
  console.log('   2. Paste the contents of: supabase/migrations/001_initial_schema.sql');
  console.log('   3. Click "Run"\n');

  console.log('='.repeat(60));
  console.log('SQL to execute:');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
}

runMigration().catch(console.error);
