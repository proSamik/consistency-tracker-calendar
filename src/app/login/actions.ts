'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { createDbClient } from '@/lib/db'
import { users } from '@/lib/db/schema'

/**
 * Handles login form submission
 * Signs in a user with email and password
 */
export async function login(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect('/error')
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

/**
 * Handles signup form submission
 * Creates a new user with email and password
 * Also initializes user profile data in the database
 */
export async function signup(formData: FormData) {
  const supabase = await createClient()

  // type-casting here for convenience
  // in practice, you should validate your inputs
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  // Sign up the user with Supabase Auth
  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error || !authData.user) {
    console.error('Signup error:', error)
    redirect('/error')
  }

  try {
    // Create user profile in the database
    const db = createDbClient()
    
    // Create a new user record with default values
    const newUser = {
      id: authData.user.id,
      email: authData.user.email || '',
      created_at: new Date(),
      updated_at: new Date(),
      username: null,
      full_name: null,
      avatar_url: null,
      github_username: null,
      twitter_username: null,
      instagram_username: null,
      youtube_username: null,
    }
    
    // Insert the new user into the database
    await db.insert(users)
      .values(newUser)
      .onConflictDoNothing({ target: users.id })
      .execute()
    
    console.log('Created user profile for:', authData.user.email)
  } catch (dbError) {
    console.error('Error creating user profile:', dbError)
    // Continue with the signup process even if profile creation fails
    // We'll attempt to create it again on first dashboard access
  }

  revalidatePath('/', 'layout')
  redirect('/')
} 