import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/db';
import { activities } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';

/**
 * GET handler to fetch privacy settings for a user
 * Returns privacy settings for each platform
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
    
    // Get the most recent activity for the user to check privacy settings
    const userActivities = await db.query.activities.findFirst({
      where: and(
        eq(activities.username, username)
      ),
      orderBy: (activitiesTable) => [desc(activitiesTable.activity_date)]
    });
    
    if (!userActivities) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return privacy settings
    return NextResponse.json({
      privacy: {
        github_private: userActivities.github_private,
        twitter_private: userActivities.twitter_private,
        youtube_private: userActivities.youtube_private,
        instagram_private: userActivities.instagram_private
      }
    });
    
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json({ error: 'Failed to fetch privacy settings' }, { status: 500 });
  }
}

/**
 * POST handler to update privacy settings
 * Verifies the user is authenticated and updates their privacy settings
 */
export async function POST(request: Request) {
  // Create Supabase client using our utility
  const supabase = await createClient();
  
  // Check authentication
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Parse request body
    const { username, platform, isPrivate } = await request.json();
    
    if (!username || !platform) {
      return NextResponse.json({ error: 'Username and platform are required' }, { status: 400 });
    }
    
    // Verify the authenticated user can modify this username's settings
    const { data: userData } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', session.user.id)
      .single();
    
    if (!userData || userData.username !== username) {
      return NextResponse.json({ error: 'You can only modify your own privacy settings' }, { status: 403 });
    }
    
    // Create database client
    const db = createDbClient();
    
    // Validate platform
    const validPlatforms = ['github', 'twitter', 'youtube', 'instagram'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    
    // Update all activities for the user with new privacy setting
    // We need to use raw SQL for dynamic column names
    const columnName = `${platform}_private`;
    
    // Use SQL template literal for safe SQL injection
    await db.execute(sql`
      UPDATE activities
      SET ${sql.identifier(columnName)} = ${isPrivate}
      WHERE username = ${username}
    `);
    
    return NextResponse.json({ success: true, message: `${platform} privacy setting updated` });
    
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
  }
} 