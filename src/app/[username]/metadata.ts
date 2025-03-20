import { createDbClient, executeWithRetry } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Metadata } from 'next'

/**
 * Generate metadata for the user profile page
 * This runs on the server and provides SEO metadata for the page
 */
export async function generateMetadata({ 
  params 
}: { 
  params: { username: string } 
}): Promise<Metadata> {
  try {
    const { username } = params
    
    // Create database client
    const db = createDbClient()
    
    // Fetch user data to include in metadata
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
    
    // Customize metadata based on user data if found
    if (userData) {
      const displayName = userData.full_name || username
      
      return {
        title: `${displayName}'s Profile`,
        description: `View ${displayName}'s public profile and social media links`,
        openGraph: {
          title: `${displayName}'s Profile`,
          description: `Connect with ${displayName} on their social media profiles`,
          type: 'profile',
          url: `/${username}`,
        },
      }
    }
    
    // Default metadata if user not found
    return {
      title: 'User Profile',
      description: 'View user profile and social media links',
    }
  } catch  {
    // Fallback metadata on error
    console.error('Error generating profile metadata')
    return {
      title: 'User Profile',
      description: 'View user profile and social media links',
    }
  }
} 