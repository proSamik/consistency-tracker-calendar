'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Validates a username based on the following rules:
 * - Cannot start with a number
 * - Cannot contain special characters
 * - Should be lowercase letters followed by optional numbers
 */
function validateUsername(username: string): string | null {
  if (!username.trim()) {
    return 'Username is required'
  }
  
  // Check if username starts with a number
  if (/^[0-9]/.test(username)) {
    return 'Username cannot start with a number'
  }
  
  // Check if username contains only lowercase letters and numbers
  if (!/^[a-z][a-z0-9]*$/.test(username)) {
    return 'Username can only contain lowercase letters and numbers'
  }
  
  return null
}

/**
 * Validates a password based on the following rules:
 * - At least 8 characters
 * - Contains at least one lowercase letter
 * - Contains at least one uppercase letter
 * - Contains at least one number
 * - Contains at least one special character
 */
function validatePassword(password: string): string | null {
  if (!password) {
    return 'Password is required'
  }
  
  // Check length
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  
  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter'
  }
  
  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter'
  }
  
  // Check for number
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number'
  }
  
  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return 'Password must include a special character'
  }
  
  return null
}

/**
 * Handles login form submission
 * Signs in a user with email and password
 */
export async function login(formData: FormData) {
  const supabase = await createClient()

  // Extract and validate credentials from form data
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  // Validate required fields
  if (!email || !password) {
    redirect('/login?error=missing_fields')
  }

  // Attempt to sign in
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  // Handle auth errors with specific redirects
  if (error) {

    
    if (error.message.includes('Invalid login credentials')) {
      redirect('/login?error=invalid_credentials')
    } else if (error.message.includes('email not confirmed')) {
      redirect('/login?error=email_not_verified')
    } else if (error.message.includes('too many requests')) {
      redirect('/login?error=too_many_attempts')
    } else if (error.message.includes('invalid email')) {
      redirect('/login?error=invalid_email')
    }
    
    // Generic error fallback
    redirect('/login?error=auth_error')
  }

  // Success flow
  revalidatePath('/', 'layout')
  redirect('/dashboard')
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
    redirect('/login?error=missing_fields')
  }
  
  // Validate username format
  const usernameError = validateUsername(username)
  if (usernameError) {
    redirect(`/login?error=invalid_username&details=${encodeURIComponent(usernameError)}`)
  }
  
  // Validate password complexity
  const passwordError = validatePassword(password)
  if (passwordError) {
    redirect(`/login?error=weak_password&details=${encodeURIComponent(passwordError)}`)
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
    options: {
      data: {
        username,
        full_name: fullName || '',
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`
    }
  })

  if (error || !authData.user) {
    console.error('Signup error:', error)
    
    // Handle specific auth errors
    if (error?.message.includes('already registered')) {
      redirect('/login?error=email_in_use')
    } else if (error?.message.includes('password')) {
      redirect('/login?error=invalid_password')
    } else if (error?.message.includes('invalid email')) {
      redirect('/login?error=invalid_email')
    }
    
    // Generic error fallback
    redirect('/login?error=signup_failed')
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
    // We'll handle this in a safer way
    redirect('/login?error=profile_creation_failed')
  }

  // Instead of redirecting to home, redirect back to login page with a success message
  redirect('/login?registration=success&email=' + encodeURIComponent(email))
} 