'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

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
 * Collects profile information during signup
 * Validates username uniqueness before creating account
 */
export async function signup(formData: FormData) {
  const supabase = await createClient()

  // Get form data
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const username = formData.get('username') as string
  const fullName = formData.get('fullName') as string
  const githubUsername = formData.get('github_username') as string
  const twitterUsername = formData.get('twitter_username') as string
  const instagramUsername = formData.get('instagram_username') as string
  const youtubeUsername = formData.get('youtube_username') as string
  
  // Validate required fields
  if (!email || !password || !username) {
    redirect('/error?message=Missing+required+fields')
  }
  
  // Check if username is already taken with retry logic
  const db = createDbClient()
  const existingUser = await executeWithRetry(async () => {
    return db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
  })
  
  if (existingUser.length > 0) {
    redirect('/login?error=username_taken')
  }

  // Sign up the user with Supabase Auth
  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error || !authData.user) {
    console.error('Signup error:', error)
    redirect('/error')
  }

  try {
    // Create user profile in the database with provided information and retry logic
    const newUser = {
      id: authData.user.id,
      email: authData.user.email || '',
      created_at: new Date(),
      updated_at: new Date(),
      username: username,
      full_name: fullName || null,
      avatar_url: null,
      github_username: githubUsername || null,
      twitter_username: twitterUsername || null,
      instagram_username: instagramUsername || null,
      youtube_username: youtubeUsername || null,
    }
    
    // Insert the new user into the database
    await executeWithRetry(async () => {
      return db.insert(users)
        .values(newUser)
        .onConflictDoNothing({ target: users.id })
        .execute()
    })
    
    console.log('Created user profile for:', authData.user.email)
  } catch (dbError) {
    console.error('Error creating user profile:', dbError)
    // Continue with the signup process even if profile creation fails
    // We'll attempt to create it again on first dashboard access
  }

  revalidatePath('/', 'layout')
  redirect('/')
} 