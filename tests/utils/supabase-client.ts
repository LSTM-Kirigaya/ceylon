import { createClient } from '@supabase/supabase-js'
import * as nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for unauthenticated operations
export const supabase = createClient(supabaseUrl, supabaseKey)

// Client for authenticated operations (requires auth token)
export const createAuthenticatedClient = (authToken: string) => {
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  })
}

// Service role client for cleanup operations (server-side only)
export const createServiceClient = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')
  }
  return createClient(supabaseUrl, serviceKey)
}
