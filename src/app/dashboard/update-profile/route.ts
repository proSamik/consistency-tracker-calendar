import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createDbClient } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, and, not } from 'drizzle-orm'

/**
 * API route handler for profile updates
 * Handles form submissions from the ProfileSection component
 * Enforces unique usernames across all users
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get form data
    const formData = await request.formData()
    const id = formData.get('id') as string
    const fullName = formData.get('fullName') as string
    const username = formData.get('username') as string
    const github_username = formData.get('github_username') as string
    const twitter_username = formData.get('twitter_username') as string
    const instagram_username = formData.get('instagram_username') as string
    const youtube_username = formData.get('youtube_username') as string
    
    // Verify user is updating their own profile
    if (id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Create database client
    const db = createDbClient()
    
    // Check if username is provided and not empty
    if (!username || username.trim() === '') {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }
    
    // Check if username is already taken by another user
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.username, username),
          not(eq(users.id, id))
        )
      )
      .limit(1)
    
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      )
    }
    
    // Update user profile in database
    await db.update(users)
      .set({
        full_name: fullName || null,
        username: username,
        github_username: github_username || null,
        twitter_username: twitter_username || null,
        instagram_username: instagram_username || null,
        youtube_username: youtube_username || null,
        updated_at: new Date(),
      })
      .where(eq(users.id, id))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
} 