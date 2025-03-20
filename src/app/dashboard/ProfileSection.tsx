'use client'

import { useState } from 'react'

/**
 * ProfileSection component for displaying and editing user profile
 * Supports inline editing with confirm/cancel options
 */
interface ProfileSectionProps {
  userId: string
  userData: any
}

export default function ProfileSection({ userId, userData }: ProfileSectionProps) {
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false)
  
  // Form data state
  const [formData, setFormData] = useState({
    fullName: userData?.full_name || '',
    username: userData?.username || '',
    githubUsername: userData?.github_username || '',
    twitterUsername: userData?.twitter_username || '',
    instagramUsername: userData?.instagram_username || '',
    youtubeUsername: userData?.youtube_username || '',
  })
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }
  
  // Cancel editing and reset form data
  const handleCancel = () => {
    setFormData({
      fullName: userData?.full_name || '',
      username: userData?.username || '',
      githubUsername: userData?.github_username || '',
      twitterUsername: userData?.twitter_username || '',
      instagramUsername: userData?.instagram_username || '',
      youtubeUsername: userData?.youtube_username || '',
    })
    setIsEditing(false)
  }
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-indigo-600">Profile Information</h2>
        
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-md font-medium hover:bg-indigo-100 transition-colors"
          >
            Edit Profile
          </button>
        )}
        
        {isEditing && (
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-md font-medium hover:bg-red-100 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Cancel
            </button>
            
            <form action="/dashboard/update-profile" method="post">
              <input type="hidden" name="id" value={userId} />
              <input type="hidden" name="fullName" value={formData.fullName} />
              <input type="hidden" name="username" value={formData.username} />
              <input type="hidden" name="github_username" value={formData.githubUsername} />
              <input type="hidden" name="twitter_username" value={formData.twitterUsername} />
              <input type="hidden" name="instagram_username" value={formData.instagramUsername} />
              <input type="hidden" name="youtube_username" value={formData.youtubeUsername} />
              
              <button
                type="submit"
                onClick={() => setIsEditing(false)}
                className="bg-green-50 text-green-600 px-4 py-2 rounded-md font-medium hover:bg-green-100 transition-colors flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Save
              </button>
            </form>
          </div>
        )}
      </div>
      
      <div className="space-y-6">
        {/* Personal Information */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              {isEditing ? (
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData?.full_name || 'Not set'}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Username</p>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData?.username || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Social Media Profiles */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media Profiles</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">GitHub</p>
              {isEditing ? (
                <input
                  type="text"
                  name="githubUsername"
                  value={formData.githubUsername}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData?.github_username || 'Not set'}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Twitter</p>
              {isEditing ? (
                <input
                  type="text"
                  name="twitterUsername"
                  value={formData.twitterUsername}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData?.twitter_username || 'Not set'}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Instagram</p>
              {isEditing ? (
                <input
                  type="text"
                  name="instagramUsername"
                  value={formData.instagramUsername}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData?.instagram_username || 'Not set'}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">YouTube</p>
              {isEditing ? (
                <input
                  type="text"
                  name="youtubeUsername"
                  value={formData.youtubeUsername}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData?.youtube_username || 'Not set'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 