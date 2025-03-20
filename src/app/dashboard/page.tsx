import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createDbClient } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Dashboard page that is protected
 * Only accessible to authenticated users
 * Displays user profile data in a table format
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
    const userResults = await db.select()
      .from(users)
      .where(eq(users.id, data.user.id))
      .limit(1)
    
    if (userResults.length > 0) {
      userData = userResults[0]
      console.log('Found existing user data:', userData)
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
        userData = insertResult[0]
        console.log('Created new user data:', userData)
      }
    }
  } catch (dbError) {
    console.error('Error accessing user data:', dbError)
  }

  // User is authenticated, show the dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-indigo-600">Dashboard</h1>
        
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Welcome {data.user.email}</h2>
          <p className="text-gray-600 mb-4">
            You are logged in and can access protected content.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-indigo-600">Update Profile</h2>
          <form action="/dashboard/update-profile" method="post">
            <input type="hidden" name="id" value={data.user.id} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-gray-700 text-sm font-bold mb-2">
                  Full Name
                </label>
                <input 
                  id="fullName" 
                  name="fullName" 
                  type="text" 
                  defaultValue={userData?.full_name || ''}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              
              <div>
                <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
                  Username
                </label>
                <input 
                  id="username" 
                  name="username" 
                  type="text" 
                  defaultValue={userData?.username || ''}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              
              <div>
                <label htmlFor="github_username" className="block text-gray-700 text-sm font-bold mb-2">
                  GitHub Username
                </label>
                <input 
                  id="github_username" 
                  name="github_username" 
                  type="text" 
                  defaultValue={userData?.github_username || ''}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              
              <div>
                <label htmlFor="twitter_username" className="block text-gray-700 text-sm font-bold mb-2">
                  Twitter Username
                </label>
                <input 
                  id="twitter_username" 
                  name="twitter_username" 
                  type="text" 
                  defaultValue={userData?.twitter_username || ''}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              
              <div>
                <label htmlFor="instagram_username" className="block text-gray-700 text-sm font-bold mb-2">
                  Instagram Username
                </label>
                <input 
                  id="instagram_username" 
                  name="instagram_username" 
                  type="text" 
                  defaultValue={userData?.instagram_username || ''}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              
              <div>
                <label htmlFor="youtube_username" className="block text-gray-700 text-sm font-bold mb-2">
                  YouTube Username
                </label>
                <input 
                  id="youtube_username" 
                  name="youtube_username" 
                  type="text" 
                  defaultValue={userData?.youtube_username || ''}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            </div>
            
            <div className="mt-6">
              <label htmlFor="avatar_url" className="block text-gray-700 text-sm font-bold mb-2">
                Avatar URL
              </label>
              <input 
                id="avatar_url" 
                name="avatar_url" 
                type="url"
                defaultValue={userData?.avatar_url || ''}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            
            <div className="mt-6">
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Update Profile
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-indigo-600">User Profile</h2>
          
          {userData ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-indigo-50 text-indigo-600 uppercase text-sm leading-normal">
                    <th className="py-3 px-6 text-left">Field</th>
                    <th className="py-3 px-6 text-left">Value</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 text-sm">
                  {userData && Object.entries(userData).map(([key, value]) => (
                    <tr key={key} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-6 text-left font-medium">{key}</td>
                      <td className="py-3 px-6 text-left">
                        {value === null ? 'null' : 
                         typeof value === 'object' ? JSON.stringify(value) : 
                         String(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-600">No user data available.</p>
          )}
          
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