#!/usr/bin/env node
/**
 * Database initialization using Supabase Management API
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8';
const SETUP_SQL = fs.readFileSync(path.join(__dirname, '..', 'sql', 'setup.sql'), 'utf8');

// Split SQL into individual statements
const statements = SETUP_SQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

async function executeSql() {
  console.log('🔧 Initializing database...\n');
  console.log(`📊 Total statements to execute: ${statements.length}\n`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const firstLine = stmt.split('\n')[0].trim();
    console.log(`[${i + 1}/${statements.length}] ${firstLine.substring(0, 60)}...`);
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sql: stmt + ';' }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`  ❌ Error: ${error}`);
      } else {
        console.log(`  ✅ OK`);
      }
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
  }

  console.log('\n✨ Database initialization complete!');
}

executeSql();
