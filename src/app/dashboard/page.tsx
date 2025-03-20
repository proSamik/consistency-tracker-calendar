import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import ProfileWrapper from './ProfileWrapper'

/**
 * Dashboard page that is protected
 * Only accessible to authenticated users
 * Displays user profile data with inline editing
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  // Always use getUser() for authentication checks
  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
    // User is not authenticated, redirect to login
    redirect('/login')
  }

  // Create database client
  const db = createDbClient()
  
  // Fetch user data from users table for the authenticated user using drizzle
  let userData = null
  try {
    // Use executeWithRetry for database operations to handle connection issues
    userData = await executeWithRetry(async () => {
      const userResults = await db.select()
        .from(users)
        .where(eq(users.id, data.user.id))
        .limit(1)
      
      if (userResults.length > 0) {
        console.log('Found existing user data:', userResults[0])
        return userResults[0]
      } else {
        // No user record found, create one
        console.log('No user found, creating new user record')
        const newUser = {
          id: data.user.id,
          email: data.user.email || '',
          created_at: new Date(),
          updated_at: new Date(),
          username: null,
          full_name: null,
          avatar_url: null,
          github_username: null,
          twitter_username: null,
          instagram_username: null,
          youtube_username: null,
        }
        
        const insertResult = await db.insert(users)
          .values(newUser)
          .returning()
        
        if (insertResult.length > 0) {
          console.log('Created new user data:', insertResult[0])
          return insertResult[0]
        }
        return null
      }
    })
  } catch (dbError) {
    console.error('Error accessing user data:', dbError)
  }

  // Format joining date
  const joiningDate = userData?.created_at 
    ? new Date(userData.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown';

  // User is authenticated, show the dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-indigo-600">Dashboard</h1>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome {data.user.email}</h2>
          <p className="text-gray-600 mb-4">
            Member since: {joiningDate}
          </p>
        </div>

        {/* Profile Section - Combined display and edit */}
        <ProfileWrapper 
          userId={data.user.id}
          userData={userData}
        />

        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <div className="mt-6">
            <form action="/auth/signout" method="post">
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 