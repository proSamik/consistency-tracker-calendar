'use client'

import { useState, useEffect } from 'react'
import { ProfileData } from '@/types/profile'
import ConsistencyCalendar from '@/components/ConsistencyCalendar'

/**
 * Component that displays activity calendars for a user's public profile
 * Shows platform-specific calendars based on which platforms the user has connected
 * Respects privacy settings - hides calendars for platforms marked as private
 */
export default function ProfileCalendars({
  userData,
  username
}: {
  userData: ProfileData
  username: string
}) {
  // State to track privacy settings for each platform
  const [privacySettings, setPrivacySettings] = useState<Record<string, boolean>>({
    github: false,
    twitter: false,
    instagram: false,
    youtube: false
  })
  
  // Fetch privacy settings when component mounts
  useEffect(() => {
    async function fetchPrivacySettings() {
      try {
        const response = await fetch(`/api/privacy?username=${username}`)
        
        if (response.ok) {
          const data = await response.json()
          setPrivacySettings(data.privacy || {})
        }
      } catch (err) {
        console.error('Error fetching privacy settings:', err)
      }
    }
    
    fetchPrivacySettings()
  }, [username])
  
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-indigo-600">Activity Calendars</h2>
      
      {/* All Platforms Calendar (always shown) */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-700">All Platforms</h3>
        <ConsistencyCalendar 
          username={username} 
          showSync={false}
          showPrivacyControls={false}
          platform="all"
          isPublicView={true}
        />
      </div>
      
      {/* Only show GitHub calendar if user has a GitHub username AND it's not private */}
      {userData.github_username && !privacySettings.github && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-green-700">GitHub</h3>
          <ConsistencyCalendar 
            username={username} 
            showSync={false}
            showPrivacyControls={false}
            platform="github"
            isPublicView={true}
          />
        </div>
      )}
      
      {/* Only show Twitter calendar if user has a Twitter username AND it's not private */}
      {userData.twitter_username && !privacySettings.twitter && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-blue-700">Twitter</h3>
          <ConsistencyCalendar 
            username={username} 
            showSync={false}
            showPrivacyControls={false}
            platform="twitter"
            isPublicView={true}
          />
        </div>
      )}
      
      {/* Only show Instagram calendar if user has an Instagram username AND it's not private */}
      {userData.instagram_username && !privacySettings.instagram && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-pink-700">Instagram</h3>
          <ConsistencyCalendar 
            username={username} 
            showSync={false}
            showPrivacyControls={false}
            platform="instagram"
            isPublicView={true}
          />
        </div>
      )}
      
      {/* Only show YouTube calendar if user has a YouTube username AND it's not private */}
      {userData.youtube_username && !privacySettings.youtube && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-xl font-semibold mb-4 text-red-700">YouTube</h3>
          <ConsistencyCalendar 
            username={username} 
            showSync={false}
            showPrivacyControls={false}
            platform="youtube"
            isPublicView={true}
          />
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-500">
        <p>
          These calendars show {userData.full_name || username}&apos;s activity across different platforms.
          Each cell represents a day, and the color intensity shows the level of activity.
          Private activities are not displayed.
        </p>
      </div>
    </div>
  )
} 