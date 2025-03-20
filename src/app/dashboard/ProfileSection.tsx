'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * ProfileSection component for displaying and editing user profile
 * Supports inline editing with confirm/cancel options
 * Handles username uniqueness validation
 */
interface ProfileSectionProps {
  userId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userData: Record<string, any> | null
}

export default function ProfileSection({ userId, userData }: ProfileSectionProps) {
  const router = useRouter()
  
  // State for edit mode
  const [isEditing, setIsEditing] = useState(false)
  
  // Error state
  const [error, setError] = useState<string | null>(null)
  
  // Form data state
  const [formData, setFormData] = useState({
    fullName: userData?.full_name || '',
    username: userData?.username || '',
    githubUsername: userData?.github_username || '',
    twitterUsername: userData?.twitter_username || '',
    instagramUsername: userData?.instagram_username || '',
    youtubeUsername: userData?.youtube_username || '',
  })
  
  // Handle case when userData is null or undefined
  if (!userData) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-indigo-600">Profile Information</h2>
        </div>
        <div className="p-4 text-gray-600">
          Loading profile information...
        </div>
      </div>
    )
  }
  
  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear error when user starts typing
    if (error) setError(null)
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
    setError(null)
  }
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validate username
    if (!formData.username || formData.username.trim() === '') {
      setError('Username is required')
      return
    }
    
    try {
      const formDataObj = new FormData()
      formDataObj.append('id', userId)
      formDataObj.append('fullName', formData.fullName)
      formDataObj.append('username', formData.username)
      formDataObj.append('github_username', formData.githubUsername)
      formDataObj.append('twitter_username', formData.twitterUsername)
      formDataObj.append('instagram_username', formData.instagramUsername)
      formDataObj.append('youtube_username', formData.youtubeUsername)
      
      const response = await fetch('/dashboard/update-profile', {
        method: 'POST',
        body: formDataObj,
      })
      
      if (response.ok) {
        setIsEditing(false)
        router.refresh() // Refresh the page to show updated data
      } else {
        const data = await response.json()
        setError(data.error || 'Error updating profile')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      setError('An unexpected error occurred')
    }
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
            
            <button
              type="button"
              onClick={handleSubmit}
              className="bg-green-50 text-green-600 px-4 py-2 rounded-md font-medium hover:bg-green-100 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Save
            </button>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
          {error}
        </div>
      )}
      
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
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData?.full_name || 'Not set'}</p>
              )}
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">
                Username
                {isEditing && <span className="text-red-500 ml-1">*</span>}
              </p>
              {isEditing ? (
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`mt-1 block w-full border ${
                    error && error.includes('Username') ? 'border-red-300' : 'border-gray-300'
                  } rounded-md py-2 px-3 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  required
                />
              ) : (
                <p className="mt-1 text-gray-900">{userData?.username || 'Not set'}</p>
              )}
              {isEditing && (
                <p className="mt-1 text-xs text-gray-500">
                  Username must be unique and will be used to identify you in the system.
                </p>
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
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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