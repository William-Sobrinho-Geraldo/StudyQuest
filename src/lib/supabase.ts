import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function assertEnv(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value.trim()
}

export function createSupabaseClient(
  url: string = SUPABASE_URL,
  anonKey: string = SUPABASE_ANON_KEY,
): SupabaseClient<Database> {
  const validatedUrl = assertEnv('VITE_SUPABASE_URL', url)
  const validatedAnonKey = assertEnv('VITE_SUPABASE_ANON_KEY', anonKey)
  return createClient<Database>(validatedUrl, validatedAnonKey)
}

export const supabase = createSupabaseClient()