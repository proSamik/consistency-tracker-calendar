import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

/**
 * Dashboard page that is protected
 * Only accessible to authenticated users
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  // Always use getUser() for authentication checks
  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
    // User is not authenticated, redirect to login
    redirect('/login')
  }

  // User is authenticated, show the dashboard
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6 text-indigo-600">Dashboard</h1>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome {data.user.email}</h2>
          <p className="text-gray-600 mb-4">
            You are logged in and can access protected content.
          </p>
          
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
  )
} 