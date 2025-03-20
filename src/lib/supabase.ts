import { createClient } from '@supabase/supabase-js';

// We need to check environment variables to avoid TypeScript errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

/**
 * Creates a Supabase client with the provided environment variables
 */
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Creates a Supabase client for server-side operations
 * Using the anon key since we don't have a service role key
 */
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for server client');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}; 