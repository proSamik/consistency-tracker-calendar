import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET handler to fetch user profile data
 * Returns public profile information for a username
 */
export async function GET(request: Request) {
  // Extract username from query parameters
  const url = new URL(request.url);
  const username = url.searchParams.get('username');
  
  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }
  
  try {
    // Create database client
    const db = createDbClient();
    
    // Get user profile data
    const userResults = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (userResults.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userResults[0];
    
    // Format data for response (remove sensitive fields if any)
    const profileData = {
      username: userData.username,
      full_name: userData.full_name,
      avatar_url: userData.avatar_url,
      created_at: userData.created_at,
      github_username: userData.github_username,
      twitter_username: userData.twitter_username,
      instagram_username: userData.instagram_username,
      youtube_username: userData.youtube_username,
    };
    
    return NextResponse.json({ profile: profileData });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
} 