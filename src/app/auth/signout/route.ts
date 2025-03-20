import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * POST handler for signing out users
 */
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  // After signout, redirect to homepage
  redirect('/')
} 