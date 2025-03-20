import { NextRequest, NextResponse } from 'next/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * API route to fetch user profile data by username
 * This is used by the client-side profile page
 * 
 * @param request The incoming request object
 * @param params Contains dynamic route parameters
 * @returns JSON response with user data or error
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function GET(
  request: NextRequest,
  context: { params: { username: string } }
) {
  try {
    // Need to await params before accessing its properties in Next.js 15
    const { username } = await context.params
    
    // Create database client
    const db = createDbClient()
    
    // Fetch user data from users table by username
    const userData = await executeWithRetry(async () => {
      const userResults = await db.select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
      
      if (userResults.length > 0) {
        return userResults[0]
      }
      return null
    })
    
    // Return 404 if user not found
    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Return user data (excluding sensitive fields)
    return NextResponse.json({
      id: userData.id,
      username: userData.username,
      full_name: userData.full_name,
      avatar_url: userData.avatar_url,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
      github_username: userData.github_username,
      twitter_username: userData.twitter_username,
      instagram_username: userData.instagram_username,
      youtube_username: userData.youtube_username,
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 