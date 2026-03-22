#!/usr/bin/env node
/**
 * Database initialization using direct PostgreSQL connection
 * Requires: DB_PASSWORD environment variable
 * 
 * Usage: DB_PASSWORD=your_password node scripts/init-db-pg.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ Error: DB_PASSWORD environment variable is required');
  console.log('\nUsage: DB_PASSWORD=your_password node scripts/init-db-pg.js');
  console.log('\nTo find your password:');
  console.log('1. Go to https://app.supabase.com/project/vaukvwgvklnpmlwhgyei/settings/database');
  console.log('2. Copy the database password');
  process.exit(1);
}

const client = new Client({
  host: 'db.vaukvwgvklnpmlwhgyei.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

const SETUP_SQL = fs.readFileSync(path.join(__dirname, '..', 'sql', 'setup.sql'), 'utf8');

async function initDatabase() {
  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected\n');

    console.log('📊 Executing SQL setup...\n');
    await client.query(SETUP_SQL);

    console.log('✅ Database initialized successfully!\n');
    console.log('📦 Created tables:');
    console.log('  ✅ profiles (用户资料)');
    console.log('  ✅ projects (项目)');
    console.log('  ✅ project_members (项目成员)');
    console.log('  ✅ version_views (版本视图)');
    console.log('  ✅ requirements (需求)');
    console.log('  ✅ cli_tokens (CLI令牌)');
    console.log('  ✅ Storage bucket: avatars');
    console.log('  ✅ All RLS policies');
    console.log('  ✅ Triggers and functions');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
