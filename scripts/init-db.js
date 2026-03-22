#!/usr/bin/env node
/**
 * Database initialization script
 * Run with: node scripts/init-db.js
 * 
 * This script uses Supabase Management API to execute SQL
 * Requires: SUPABASE_ACCESS_TOKEN environment variable
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_PROJECT_ID = 'vaukvwgvklnpmlwhgyei';
const SETUP_SQL_PATH = path.join(__dirname, '..', 'sql', 'setup.sql');

async function initDatabase() {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('❌ Error: SUPABASE_ACCESS_TOKEN environment variable is required');
    console.log('\nTo get your access token:');
    console.log('1. Go to https://app.supabase.com/account/tokens');
    console.log('2. Generate a new access token');
    console.log('3. Run: SUPABASE_ACCESS_TOKEN=your_token node scripts/init-db.js');
    process.exit(1);
  }

  try {
    // Read SQL file
    const sql = fs.readFileSync(SETUP_SQL_PATH, 'utf8');
    console.log('📖 Loaded SQL file:', SETUP_SQL_PATH);
    console.log('📊 SQL length:', sql.length, 'characters');

    // Execute SQL via Supabase Management API
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/queries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${JSON.stringify(error, null, 2)}`);
    }

    const result = await response.json();
    console.log('✅ Database initialized successfully!');
    console.log('📋 Result:', JSON.stringify(result, null, 2));
    
    console.log('\n📦 Created tables:');
    console.log('  - profiles (用户资料)');
    console.log('  - projects (项目)');
    console.log('  - project_members (项目成员)');
    console.log('  - version_views (版本视图)');
    console.log('  - requirements (需求)');
    console.log('  - cli_tokens (CLI令牌)');
    
  } catch (error) {
    console.error('❌ Failed to initialize database:', error.message);
    process.exit(1);
  }
}

initDatabase();
