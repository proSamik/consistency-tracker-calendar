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
  
  // Log the username received for debugging
  useEffect(() => {
    console.log(`PrivacyControls component initialized with username: ${username}`);
  }, [username]);

  // Fetch current privacy settings on component mount
  useEffect(() => {
    async function fetchPrivacySettings() {
      if (!username) {
        console.error('No username provided to PrivacyControls component');
        setError('No username available');
        setLoading(false);
        return;
      }
      
      setLoading(true)
      setError(null)
      
      try {
        console.log(`Fetching privacy settings for: ${username}`);
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
        console.log('Received privacy settings:', data);
        
        // Handle both old and new privacy format
        if (data.privacy) {
          const privacy = data.privacy;
          
          // If it's the new format (github, twitter, etc.), convert to old format (github_private, twitter_private, etc.)
          if ('github' in privacy || 'twitter' in privacy || 'youtube' in privacy || 'instagram' in privacy) {
            setPrivacySettings({
              github_private: privacy.github || false,
              twitter_private: privacy.twitter || false,
              youtube_private: privacy.youtube || false,
              instagram_private: privacy.instagram || false
            });
          } else {
            // Old format, use as-is
            setPrivacySettings(privacy);
          }
        }
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
    if (!username) {
      console.error('No username available for privacy toggle');
      setError('No username available');
      return;
    }
    
    const currentValue = privacySettings[`${platformName}_private` as keyof typeof privacySettings]
    
    // Optimistically update UI
    setPrivacySettings(prev => ({
      ...prev,
      [`${platformName}_private`]: !currentValue
    }))
    
    try {
      console.log(`Toggling privacy for ${platformName} to ${!currentValue} for user ${username}`);
      
      const payload = {
        username,
        platform: platformName,
        isPrivate: !currentValue
      };
      
      console.log('Sending payload:', payload);
      
      const response = await fetch('/api/privacy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // Revert optimistic update on error
        setPrivacySettings(prev => ({
          ...prev,
          [`${platformName}_private`]: currentValue
        }))
        
        console.error('Privacy update failed:', responseData);
        throw new Error(responseData.error || responseData.detail || 'Failed to update privacy setting')
      }
      
      console.log(`${platformName} privacy setting updated successfully:`, responseData);
    } catch (err: any) {
      console.error('Error updating privacy setting:', err)
      setError(`Failed to update ${platformName} privacy setting: ${err.message}`)
      
      // Error message will auto-clear after 5 seconds
      setTimeout(() => setError(null), 5000)
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

  // If viewing a specific platform, only show that platform's toggle
  if (platform !== 'all') {
    return (
      <div className="flex flex-col space-y-2 mb-4">
        <h3 className="text-sm font-medium text-gray-300">Privacy Setting</h3>
        
        {error && (
          <div className="bg-red-900 text-white p-2 mb-2 rounded text-xs">
            {error}
          </div>
        )}
        
        <div className="flex items-center justify-between p-2 rounded bg-opacity-30" 
          style={{
            backgroundColor: platform === 'github' ? 'rgba(22, 163, 74, 0.3)' : 
                            platform === 'twitter' ? 'rgba(29, 155, 240, 0.3)' :
                            platform === 'youtube' ? 'rgba(239, 68, 68, 0.3)' : 
                            'rgba(219, 39, 119, 0.3)'
          }}>
          <div className="text-sm">
            <span className="font-medium">{platform.charAt(0).toUpperCase() + platform.slice(1)}:</span> {getPrivacyLabel(platform)}
          </div>
          <Switch 
            checked={privacySettings[`${platform}_private` as keyof typeof privacySettings]}
            onCheckedChange={() => togglePrivacy(platform)}
            className={
              platform === 'github' ? 'data-[state=checked]:bg-green-600' : 
              platform === 'twitter' ? 'data-[state=checked]:bg-blue-600' :
              platform === 'youtube' ? 'data-[state=checked]:bg-red-600' : 
              'data-[state=checked]:bg-pink-600'
            }
          />
        </div>
      </div>
    )
  }

  // Otherwise show all platform toggles (for "all" view)
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
        <div className="flex items-center justify-between p-2 rounded bg-green-900/30">
          <div className="text-xs">
            <span className="font-medium">GitHub:</span> {getPrivacyLabel('github')}
          </div>
          <Switch 
            checked={privacySettings.github_private}
            onCheckedChange={() => togglePrivacy('github')}
            className="data-[state=checked]:bg-green-600"
          />
        </div>
        
        {/* Twitter Privacy Toggle */}
        <div className="flex items-center justify-between p-2 rounded bg-blue-900/30">
          <div className="text-xs">
            <span className="font-medium">Twitter:</span> {getPrivacyLabel('twitter')}
          </div>
          <Switch 
            checked={privacySettings.twitter_private}
            onCheckedChange={() => togglePrivacy('twitter')}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>
        
        {/* YouTube Privacy Toggle */}
        <div className="flex items-center justify-between p-2 rounded bg-red-900/30">
          <div className="text-xs">
            <span className="font-medium">YouTube:</span> {getPrivacyLabel('youtube')}
          </div>
          <Switch 
            checked={privacySettings.youtube_private}
            onCheckedChange={() => togglePrivacy('youtube')}
            className="data-[state=checked]:bg-red-600"
          />
        </div>
        
        {/* Instagram Privacy Toggle */}
        <div className="flex items-center justify-between p-2 rounded bg-pink-900/30">
          <div className="text-xs">
            <span className="font-medium">Instagram:</span> {getPrivacyLabel('instagram')}
          </div>
          <Switch 
            checked={privacySettings.instagram_private}
            onCheckedChange={() => togglePrivacy('instagram')}
            className="data-[state=checked]:bg-pink-600"
          />
        </div>
      </div>
    </div>
  )
} 