import { NextResponse } from 'next/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * API route to check if a username is already taken
 * Used during signup to validate username uniqueness
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get('username')
  
  if (!username || username.trim() === '') {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    )
  }
  
  try {
    const db = createDbClient()
    
    // Check if username already exists with retry logic
    const existingUser = await executeWithRetry(async () => {
      return db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
    })
    
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      )
    }
    
    // Username is available
    return NextResponse.json({ available: true })
  } catch (error) {
    console.error('Error checking username:', error)
    return NextResponse.json(
      { error: 'Failed to check username' },
      { status: 500 }
    )
  }
} 