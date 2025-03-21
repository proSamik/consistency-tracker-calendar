import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import ProfileWrapper from './ProfileWrapper'
import ConsistencyCalendar from '@/components/ConsistencyCalendar'
import Link from 'next/link'

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
      <div className="max-w-5xl mx-auto p-8">
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

        {/* Consistency Calendar Section */}
        {userData?.username && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-4 text-indigo-600">Activity Calendars</h2>
            
            {/* All Platforms Calendar */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-700">All Platforms</h3>
              <ConsistencyCalendar 
                username={userData.username} 
                showSync={true}
                showPrivacyControls={true}
                platform="all"
              />
            </div>
            
            {/* GitHub Calendar */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-green-700">GitHub</h3>
              <ConsistencyCalendar 
                username={userData.username} 
                showSync={true}
                showPrivacyControls={true}
                platform="github"
              />
            </div>
            
            {/* Twitter Calendar */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-blue-700">Twitter</h3>
              <ConsistencyCalendar 
                username={userData.username} 
                showSync={true}
                showPrivacyControls={true}
                platform="twitter"
              />
            </div>
            
            {/* Instagram Calendar */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-pink-700">Instagram</h3>
              <ConsistencyCalendar 
                username={userData.username} 
                showSync={true}
                showPrivacyControls={true}
                platform="instagram"
              />
            </div>
            
            {/* YouTube Calendar */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4 text-red-700">YouTube</h3>
              <ConsistencyCalendar 
                username={userData.username} 
                showSync={true}
                showPrivacyControls={true}
                platform="youtube"
              />
            </div>
            
            <div className="mt-4 bg-indigo-50 p-4 rounded-lg text-sm text-gray-700">
              <h3 className="font-semibold text-indigo-700 mb-2">About Your Consistency Calendars</h3>
              <p className="mb-2">
                These calendars track your activities across multiple platforms:
              </p>
              <ul className="list-disc pl-5 mb-2 space-y-1">
                <li><span className="text-green-700 font-medium">GitHub</span> contributions</li>
                <li><span className="text-blue-700 font-medium">Twitter</span> posts</li>
                <li><span className="text-pink-700 font-medium">Instagram</span> content</li>
                <li><span className="text-red-700 font-medium">YouTube</span> videos</li>
              </ul>
              <p>
                Use the sync buttons to update your data. Click on any day to see detailed activity information.
              </p>
            </div>

            <div className="mt-6 flex items-center">
              <Link 
                href={`/${userData.username}/profile`} 
                className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
              >
                <span>View public profile</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
              <div className="ml-4 text-sm text-gray-500">
                Share your consistency calendar with others
              </div>
            </div>
          </div>
        )}

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