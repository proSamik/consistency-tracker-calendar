import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createDbClient } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Handles profile update form submission
 * Only allows authenticated users to update their own profile
 */
export async function POST(request: NextRequest) {
  // Get form data
  const formData = await request.formData()
  const userId = formData.get('id') as string
  
  console.log('Processing profile update for user ID:', userId)
  
  // Create Supabase client for auth
  const supabase = await createClient()
  
  // Verify the user is authenticated
  const { data: userData, error: authError } = await supabase.auth.getUser()
  
  if (authError || !userData?.user || userData.user.id !== userId) {
    console.error('Authentication error:', authError)
    // User is not authenticated or trying to update someone else's profile
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Prepare data for update according to the drizzle schema
  const profileData = {
    full_name: formData.get('fullName') as string || null,
    username: formData.get('username') as string || null,
    avatar_url: formData.get('avatar_url') as string || null,
    github_username: formData.get('github_username') as string || null,
    twitter_username: formData.get('twitter_username') as string || null,
    instagram_username: formData.get('instagram_username') as string || null,
    youtube_username: formData.get('youtube_username') as string || null,
    updated_at: new Date(),
  }
  
  console.log('Updating profile with data:', profileData)
  
  try {
    // First check if the user exists in the database
    const db = createDbClient()
    const existingUser = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
    
    if (existingUser.length === 0) {
      // User doesn't exist in database, create a new record
      console.log('User not found in database, creating new record')
      const newUserData = {
        id: userId,
        email: userData.user.email || '',
        created_at: new Date(),
        ...profileData
      }
      
      await db.insert(users)
        .values(newUserData)
        .execute()
    } else {
      // Update existing user
      console.log('Updating existing user record')
      await db.update(users)
        .set(profileData)
        .where(eq(users.id, userId))
        .execute()
    }
    
    // Redirect back to dashboard without any status parameters
    return NextResponse.redirect(new URL('/dashboard', request.url))
  } catch (error) {
    console.error('Error updating profile:', error)
    // Redirect back to dashboard even if there was an error
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
} 