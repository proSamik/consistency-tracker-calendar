'use client'

import { ProfileData } from '@/types/profile'
import ConsistencyCalendar from '@/components/ConsistencyCalendar'

/**
 * Component that displays activity calendars for a user's public profile
 * Shows platform-specific calendars based on which platforms the user has connected
 */
export default function ProfileCalendars({
  userData,
  username
}: {
  userData: ProfileData
  username: string
}) {
  return (
    <div className="mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-indigo-600">Activity Calendars</h2>
      
      {/* All Platforms Calendar */}
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
      
      {/* Only show GitHub calendar if user has a GitHub username */}
      {userData.github_username && (
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
      
      {/* Only show Twitter calendar if user has a Twitter username */}
      {userData.twitter_username && (
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
      
      {/* Only show Instagram calendar if user has an Instagram username */}
      {userData.instagram_username && (
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
      
      {/* Only show YouTube calendar if user has a YouTube username */}
      {userData.youtube_username && (
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
          These calendars show {userData.full_name || username}'s activity across different platforms.
          Each cell represents a day, and the color intensity shows the level of activity.
          Private activities are not displayed.
        </p>
      </div>
    </div>
  )
} 