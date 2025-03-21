import { NextResponse } from 'next/server';
import { createDbClient } from '@/lib/db';
import { activities, users } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { createClient } from '@/utils/supabase/server';

/**
 * GET handler to fetch privacy settings for a user
 * Returns privacy settings for each platform
 * Supports both new platform_settings table and legacy activities table privacy columns
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = await createClient();
    
    // Try to get privacy settings from platform_settings table first
    const { data: privacyData, error: privacyError } = await supabase
      .from('platform_settings')
      .select('platform, is_private')
      .eq('username', username);
    
    // If there are privacy settings in the platform_settings table, use those
    if (!privacyError && privacyData && privacyData.length > 0) {
      // Convert array of settings to an object for easier consumption
      const privacySettings: Record<string, boolean> = {};
      
      privacyData.forEach(setting => {
        privacySettings[setting.platform] = setting.is_private;
      });
      
      return NextResponse.json({
        privacy: privacySettings
      });
    }
    
    // Fallback to the activities table if no settings found in platform_settings
    // Create database client for Drizzle
    const db = createDbClient();
    
    // Get the most recent activity for the user to check privacy settings
    const userActivity = await db.query.activities.findFirst({
      where: eq(activities.username, username),
      orderBy: [desc(activities.activity_date)]
    });
    
    if (!userActivity) {
      // No activities found, return empty privacy settings
      return NextResponse.json({
        privacy: {
          github: false,
          twitter: false,
          instagram: false,
          youtube: false
        }
      });
    }
    
    // Return privacy settings from the activities table
    return NextResponse.json({
      privacy: {
        github: userActivity.github_private,
        twitter: userActivity.twitter_private,
        instagram: userActivity.instagram_private,
        youtube: userActivity.youtube_private
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST handler to update privacy settings
 * Verifies the user is authenticated and updates their privacy settings
 */
export async function POST(request: Request) {
  // Create Supabase client using our utility
  const supabase = await createClient();
  
  // Use getUser() for secure authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('Auth error:', userError);
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  
  try {
    // Parse request body
    const { username, platform, isPrivate } = await request.json();
    
    if (!username || !platform) {
      return NextResponse.json({ error: 'Username and platform are required' }, { status: 400 });
    }
    
    console.log(`Authenticated user ID: ${user.id}`);
    console.log(`Requested username: ${username}`);
    
    // Create database client
    const db = createDbClient();
    
    // Verify the authenticated user can modify this username's settings by looking in the database directly
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, user.id)
    });
    
    console.log('User record from DB:', userRecord);
    
    if (!userRecord) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }
    
    if (!userRecord.username) {
      return NextResponse.json({ 
        error: 'Username not set', 
        detail: 'You need to set a username in your profile first'
      }, { status: 400 });
    }
    
    if (userRecord.username !== username) {
      console.error(`Username mismatch: ${userRecord.username} vs requested ${username}`);
      return NextResponse.json({ 
        error: 'You can only modify your own privacy settings',
        detail: `Your username is ${userRecord.username}, but trying to modify ${username}`
      }, { status: 403 });
    }
    
    // Validate platform
    const validPlatforms = ['github', 'twitter', 'youtube', 'instagram'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
    }
    
    // Ensure the user has at least one activity before trying to update privacy settings
    const hasActivities = await db.query.activities.findFirst({
      where: eq(activities.username, username)
    });
    
    if (!hasActivities) {
      return NextResponse.json({ 
        error: 'No activities found',
        detail: 'You need to sync at least one activity before setting privacy settings'  
      }, { status: 404 });
    }
    
    // Update all activities for the user with new privacy setting
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