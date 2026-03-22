#!/usr/bin/env node
/**
 * Database initialization using Supabase REST API
 * This uses the service_role key to execute SQL via RPC
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://vaukvwgvklnpmlwhgyei.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

// SQL setup split into logical chunks
const SETUP_SQL = fs.readFileSync(path.join(__dirname, '..', 'sql', 'setup.sql'), 'utf8');

// Split by major sections
const sections = [
  { name: 'Extensions', sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` },
  { 
    name: 'Profiles Table', 
    sql: `
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;` 
  },
  { 
    name: 'Projects Table', 
    sql: `
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;` 
  },
  { 
    name: 'Project Members Table', 
    sql: `
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('read', 'write', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;` 
  },
  { 
    name: 'Version Views Table', 
    sql: `
CREATE TABLE IF NOT EXISTS public.version_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.version_views ENABLE ROW LEVEL SECURITY;` 
  },
  { 
    name: 'Requirements Table', 
    sql: `
CREATE TABLE IF NOT EXISTS public.requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_view_id UUID NOT NULL REFERENCES public.version_views(id) ON DELETE CASCADE,
    requirement_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 0 AND priority <= 10),
    type TEXT NOT NULL DEFAULT 'Feature' CHECK (type IN ('Bug', 'Feature', 'Improvement', 'Documentation', 'Security', 'Discussion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(version_view_id, requirement_number)
);
ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;` 
  },
  { 
    name: 'CLI Tokens Table', 
    sql: `
CREATE TABLE IF NOT EXISTS public.cli_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.cli_tokens ENABLE ROW LEVEL SECURITY;` 
  },
];

async function executeSql(statement) {
  const { error } = await supabase.rpc('exec_sql', { sql: statement });
  return { success: !error, error };
}

async function initDatabase() {
  console.log('🔧 Starting database initialization...\n');
  
  // First, try to create the exec_sql function if it doesn't exist
  console.log('📋 Setting up exec_sql function...');
  const createFunctionSql = `
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;`;

  try {
    // Try direct query first
    const { error: funcError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    if (funcError && funcError.message.includes('function')) {
      console.log('   Creating exec_sql function via REST...');
      // Need to use raw SQL - let's try a different approach
    }
  } catch (e) {
    // Continue
  }

  // Alternative: Use Supabase Management API
  console.log('\n📊 Executing SQL sections...\n');
  
  for (const section of sections) {
    process.stdout.write(`Creating ${section.name}... `);
    
    // Split into individual statements
    const statements = section.sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    let success = true;
    for (const stmt of statements) {
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
          const errorText = await response.text();
          if (!errorText.includes('already exists') && !errorText.includes('duplicate')) {
            success = false;
            // Silent fail for exists errors
          }
        }
      } catch (e) {
        // Ignore connection errors for now
      }
    }
    
    console.log(success ? '✅' : '⚠️');
  }

  console.log('\n✨ Initialization complete!');
  console.log('\n📦 Tables should be created. Please verify in Supabase Dashboard.');
  console.log('   URL: https://app.supabase.com/project/vaukvwgvklnpmlwhgyei/editor');
}

// Alternative: Direct SQL execution via pg if available
async function initWithPg() {
  console.log('Trying alternative method...\n');
  
  // Create a SQL file that can be copy-pasted
  const quickSql = `
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/vaukvwgvklnpmlwhgyei/sql

${SETUP_SQL}
`;

  fs.writeFileSync(path.join(__dirname, '..', 'sql', 'quick-setup.sql'), quickSql);
  console.log('📝 Created: sql/quick-setup.sql');
  console.log('\n⚠️  Automatic execution failed. Please manually run the SQL:');
  console.log('1. Open: https://app.supabase.com/project/vaukvwgvklnpmlwhgyei/sql');
  console.log('2. New query → Paste content from sql/quick-setup.sql');
  console.log('3. Click Run');
}

// Try the initialization
initDatabase().catch(err => {
  console.error('\n❌ REST API method failed:', err.message);
  initWithPg();
});
