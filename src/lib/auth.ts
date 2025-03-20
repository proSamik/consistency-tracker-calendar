import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get the currently logged in user from the session
 * @returns User object or null if not logged in
 */
export async function getLoggedInUser() {
  // Create Supabase client without cookieStore parameter
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return null
  }
  
  // Get user data from Supabase auth
  const { data: userData } = await supabase.auth.getUser()
  
  return userData?.user || null
}

/**
 * Check if user is authenticated and redirect to login if not
 * @param redirectTo URL to redirect to after login
 * @returns Logged in user data
 */
export async function requireAuth(redirectTo = '/login') {
  const user = await getLoggedInUser()
  
  if (!user) {
    // Add return_to parameter to redirect back after login
    const encoded = encodeURIComponent(redirectTo)
    redirect(`/login?returnTo=${encoded}`)
  }
  
  return user
}

/**
 * Check if the current user is the owner of the specified username
 * @param username Username to check
 * @returns True if the user is the owner
 */
export async function isOwner(username: string) {
  const user = await getLoggedInUser()
  
  if (!user) {
    return false
  }
  
  // Get user metadata to check username
  const supabase = await createClient()
  
  const { data } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single()
  
  return data?.username === username
} 