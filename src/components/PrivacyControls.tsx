'use client'

import { useState, useEffect } from 'react'
import { Switch } from '@/components/ui/switch'

interface PrivacyControlsProps {
  username: string
  platform: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
}

/**
 * Component that displays privacy toggle controls for each platform
 * Allows users to make their platform activity private or public
 */
export default function PrivacyControls({ username, platform }: PrivacyControlsProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [privacySettings, setPrivacySettings] = useState({
    github_private: false,
    twitter_private: false,
    youtube_private: false,
    instagram_private: false
  })

  // Fetch current privacy settings on component mount
  useEffect(() => {
    async function fetchPrivacySettings() {
      if (!username) return
      
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/privacy?username=${username}`)
        
        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated, show message but don't treat as error
            console.log('Authentication required to view privacy settings')
            setLoading(false)
            return
          }
          
          throw new Error(`Failed to fetch privacy settings: ${response.status}`)
        }
        
        const data = await response.json()
        setPrivacySettings(data.privacy)
      } catch (err: any) {
        console.error('Error fetching privacy settings:', err)
        setError('Failed to load privacy settings')
      } finally {
        setLoading(false)
      }
    }
    
    fetchPrivacySettings()
  }, [username])

  /**
   * Toggle privacy setting for a specific platform
   */
  async function togglePrivacy(platformName: string) {
    if (!username) return
    
    // Don't allow toggling if all platforms view is selected
    if (platform !== 'all' && platform !== platformName) return
    
    const currentValue = privacySettings[`${platformName}_private` as keyof typeof privacySettings]
    
    // Optimistically update UI
    setPrivacySettings(prev => ({
      ...prev,
      [`${platformName}_private`]: !currentValue
    }))
    
    try {
      const response = await fetch('/api/privacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          platform: platformName,
          isPrivate: !currentValue
        })
      })
      
      if (!response.ok) {
        // Revert optimistic update on error
        setPrivacySettings(prev => ({
          ...prev,
          [`${platformName}_private`]: currentValue
        }))
        
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update privacy setting')
      }
      
      console.log(`${platformName} privacy setting updated`)
    } catch (err: any) {
      console.error('Error updating privacy setting:', err)
      setError(`Failed to update ${platformName} privacy setting`)
      
      // Error message will auto-clear after 3 seconds
      setTimeout(() => setError(null), 3000)
    }
  }

  /**
   * Get label text based on platform and privacy state
   */
  function getPrivacyLabel(platformName: string) {
    const isPrivate = privacySettings[`${platformName}_private` as keyof typeof privacySettings]
    return isPrivate ? 'Private' : 'Public'
  }

  if (loading) {
    return (
      <div className="flex justify-center py-2">
        <div className="animate-pulse bg-gray-700 h-6 w-32 rounded"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col space-y-2 mb-4">
      <h3 className="text-sm font-medium text-gray-300">Privacy Settings</h3>
      
      {error && (
        <div className="bg-red-900 text-white p-2 mb-2 rounded text-xs">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-4">
        {/* GitHub Privacy Toggle */}
        <div className={`flex items-center justify-between p-2 rounded ${platform === 'github' || platform === 'all' ? 'bg-green-900/30' : 'bg-gray-800 opacity-50'}`}>
          <div className="text-xs">
            <span className="font-medium">GitHub:</span> {getPrivacyLabel('github')}
          </div>
          <Switch 
            checked={privacySettings.github_private}
            onCheckedChange={() => togglePrivacy('github')}
            disabled={platform !== 'github' && platform !== 'all'}
            className="data-[state=checked]:bg-green-600"
          />
        </div>
        
        {/* Twitter Privacy Toggle */}
        <div className={`flex items-center justify-between p-2 rounded ${platform === 'twitter' || platform === 'all' ? 'bg-blue-900/30' : 'bg-gray-800 opacity-50'}`}>
          <div className="text-xs">
            <span className="font-medium">Twitter:</span> {getPrivacyLabel('twitter')}
          </div>
          <Switch 
            checked={privacySettings.twitter_private}
            onCheckedChange={() => togglePrivacy('twitter')}
            disabled={platform !== 'twitter' && platform !== 'all'}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
        
        {/* YouTube Privacy Toggle */}
        <div className={`flex items-center justify-between p-2 rounded ${platform === 'youtube' || platform === 'all' ? 'bg-red-900/30' : 'bg-gray-800 opacity-50'}`}>
          <div className="text-xs">
            <span className="font-medium">YouTube:</span> {getPrivacyLabel('youtube')}
          </div>
          <Switch 
            checked={privacySettings.youtube_private}
            onCheckedChange={() => togglePrivacy('youtube')}
            disabled={platform !== 'youtube' && platform !== 'all'}
            className="data-[state=checked]:bg-red-600"
          />
        </div>
        
        {/* Instagram Privacy Toggle */}
        <div className={`flex items-center justify-between p-2 rounded ${platform === 'instagram' || platform === 'all' ? 'bg-pink-900/30' : 'bg-gray-800 opacity-50'}`}>
          <div className="text-xs">
            <span className="font-medium">Instagram:</span> {getPrivacyLabel('instagram')}
          </div>
          <Switch 
            checked={privacySettings.instagram_private}
            onCheckedChange={() => togglePrivacy('instagram')}
            disabled={platform !== 'instagram' && platform !== 'all'}
            className="data-[state=checked]:bg-pink-600"
          />
        </div>
      </div>
    </div>
  )
} 