'use client'

import { useState, useEffect } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import React from 'react'
import ProfileHeader from '@/components/ProfileHeader'
import SocialProfiles from '@/components/SocialProfiles'
import ProfileCalendars from '@/components/ProfileCalendars'
import { ProfileData } from '@/types/profile'

interface PageParams {
  username: string
}

/**
 * Public profile page for viewing a user's consistency calendar
 * Available to anyone, no authentication required
 * Uses API routes to fetch data rather than direct database access
 */
export default function ProfilePage({ params }: { params: Promise<PageParams> }) {
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const { username } = unwrappedParams;
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
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="max-w-5xl mx-auto p-8">
        {/* Profile Header */}
        <ProfileHeader userData={userData} username={username} />
        
        {/* Social Media Profiles */}
        <SocialProfiles userData={userData} />
        
        {/* Activity Calendars */}
        <ProfileCalendars userData={userData} username={username} />
      </div>
    </div>
  )
} 