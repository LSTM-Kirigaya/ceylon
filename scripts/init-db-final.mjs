#!/usr/bin/env node
/**
 * Database initialization via Supabase Management API
 * Uses Service Role Key for authentication
 */

// Use node-fetch for better compatibility
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'vaukvwgvklnpmlwhgyei';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdWt2d2d2a2xucG1sd2hneWVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5NTQwMywiZXhwIjoyMDg5NzcxNDAzfQ.oeZHkt9gkvNg9ygvRa79IxNQ0va5TVdcVZhM3AvE_a8';

const SETUP_SQL = fs.readFileSync(path.join(__dirname, '..', 'sql', 'setup.sql'), 'utf8');

// Make HTTPS request
function makeRequest(hostname, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      path,
      method,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Try to execute SQL via pgBouncer or direct connection
async function tryExecuteSQL() {
  console.log('🔧 Attempting to initialize database...\n');
  
  // Management API endpoint
  const managementHost = 'api.supabase.com';
  
  // Try to get project info first
  console.log('📡 Connecting to Supabase Management API...');
  
  try {
    const result = await makeRequest(
      managementHost,
      `/v1/projects/${PROJECT_REF}`,
      'GET',
      { 'Authorization': `Bearer ${SERVICE_KEY}` }
    );
    
    console.log('   Status:', result.status);
    
    if (result.status === 200) {
      console.log('   ✅ Connected to project:', result.data.name || PROJECT_REF);
    } else {
      console.log('   ⚠️  Service key may not have management access');
      console.log('   Response:', result.data);
    }
  } catch (err) {
    console.log('   ⚠️  Could not connect:', err.message);
  }

  // Try executing SQL via REST API
  console.log('\n📊 Executing SQL statements...\n');
  
  const statements = [
    { name: 'Extensions', sql: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";` },
    { 
      name: 'Profiles Table',
      sql: `CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    },
    {
      name: 'Projects Table',
      sql: `CREATE TABLE IF NOT EXISTS public.projects (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        description TEXT,
        owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    },
    {
      name: 'Project Members Table',
      sql: `CREATE TABLE IF NOT EXISTS public.project_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('read', 'write', 'admin')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      );`
    },
    {
      name: 'Version Views Table',
      sql: `CREATE TABLE IF NOT EXISTS public.version_views (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    },
    {
      name: 'Requirements Table',
      sql: `CREATE TABLE IF NOT EXISTS public.requirements (
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
      );`
    },
    {
      name: 'CLI Tokens Table',
      sql: `CREATE TABLE IF NOT EXISTS public.cli_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        last_used_at TIMESTAMP WITH TIME ZONE,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    }
  ];

  // Use the REST API to execute SQL
  const restHost = `${PROJECT_REF}.supabase.co`;
  
  for (const stmt of statements) {
    process.stdout.write(`Creating ${stmt.name}... `);
    
    try {
      // Try to execute via REST
      const result = await makeRequest(
        restHost,
        '/rest/v1/',
        'POST',
        {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        {}
      );
      
      console.log('⏭️');
    } catch (err) {
      console.log('⏭️');
    }
  }

  console.log('\n⚠️  Direct SQL execution requires database password or Supabase CLI.');
  console.log('\n💡 Recommended: Use the SQL Editor in Dashboard:');
  console.log('   https://app.supabase.com/project/vaukvwgvklnpmlwhgyei/sql');
  console.log('\n   Or provide your database password to continue with automatic setup.');
}

tryExecuteSQL();
