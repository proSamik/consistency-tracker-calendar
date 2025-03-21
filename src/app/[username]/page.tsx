'use client'

import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ConsistencyCalendar from '@/components/ConsistencyCalendar'

interface ProfileData {
  username: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  github_username: string | null
  twitter_username: string | null
  instagram_username: string | null
  youtube_username: string | null
}

/**
 * Public profile page for viewing a user's consistency calendar
 * Available to anyone, no authentication required
 * Uses API routes to fetch data rather than direct database access
 */
export default function ProfilePage({ params }: { params: { username: string } }) {
  const { username } = params
  const [userData, setUserData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch user profile data from API
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        setLoading(true)
        
        const response = await fetch(`/api/profile?username=${username}`)
        
        if (response.status === 404) {
          notFound()
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }
        
        const data = await response.json()
        setUserData(data.profile)
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError('Failed to load user profile')
      } finally {
        setLoading(false)
      }
    }
    
    fetchUserProfile()
  }, [username])
  
  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }
  
  // Show error state
  if (error || !userData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl text-red-600 mb-4">Error</h1>
          <p className="text-gray-700">{error || 'Failed to load user profile'}</p>
          <Link href="/" className="mt-4 inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
            Go Home
          </Link>
        </div>
      </div>
    )
  }
  
  // Format joining date
  const joiningDate = userData.created_at 
    ? new Date(userData.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown'
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-5xl mx-auto p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600">
              {userData.full_name || username}
            </h1>
            <p className="text-gray-600 mt-2">
              Member since: {joiningDate}
            </p>
          </div>
          <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
            Home
          </Link>
        </div>
        
        {/* Social Media Profiles */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-indigo-600 mb-6">Social Media Profiles</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userData.github_username && (
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-3 rounded-full">
                  <svg className="h-6 w-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">GitHub</h3>
                  <a 
                    href={`https://github.com/${userData.github_username}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {userData.github_username}
                  </a>
                </div>
              </div>
            )}

            {userData.twitter_username && (
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-3 rounded-full">
                  <svg className="h-6 w-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Twitter</h3>
                  <a 
                    href={`https://twitter.com/${userData.twitter_username}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {userData.twitter_username}
                  </a>
                </div>
              </div>
            )}

            {userData.instagram_username && (
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-3 rounded-full">
                  <svg className="h-6 w-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Instagram</h3>
                  <a 
                    href={`https://instagram.com/${userData.instagram_username}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {userData.instagram_username}
                  </a>
                </div>
              </div>
            )}

            {userData.youtube_username && (
              <div className="flex items-center space-x-3">
                <div className="bg-gray-100 p-3 rounded-full">
                  <svg className="h-6 w-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">YouTube</h3>
                  <a 
                    href={`https://youtube.com/@${userData.youtube_username}`}
                    target="_blank"
                    rel="noopener noreferrer" 
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {userData.youtube_username}
                  </a>
                </div>
              </div>
            )}

            {!userData.github_username && !userData.twitter_username && 
              !userData.instagram_username && !userData.youtube_username && (
              <p className="text-gray-500 col-span-2 text-center py-4">
                No social profiles have been added yet.
              </p>
            )}
          </div>
        </div>
        
        {/* Consistency Calendar */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-indigo-600 mb-6">Activity Calendar</h2>
          <ConsistencyCalendar username={username} showSync={false} isPublicView={true} />
          
          <div className="mt-4 text-sm text-gray-500">
            <p>
              This calendar shows {userData.full_name || username}'s activity across different platforms.
              Each cell represents a day, and the color intensity shows the level of activity.
              Private activities are not displayed.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 