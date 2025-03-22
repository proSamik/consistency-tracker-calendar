'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'

interface ActivityDetailsProps {
  username: string
  date: string
  onClose: () => void
  canSync?: boolean
  platformFilter?: 'github' | 'twitter' | 'instagram' | 'youtube'
  isPublicView?: boolean
}

interface DetailedActivity {
  date: string
  username: string
  totalCount: number
  lastSynced: string
  privacy: {
    github_private: boolean
    twitter_private: boolean
    instagram_private: boolean
    youtube_private: boolean
  }
  github: {
    contributions: number
    repositories: Array<{
      name: string
      nameWithOwner: string
      url: string
      contributions: number
    }>
  }
  twitter: {
    tweet_count: number
    tweet_urls: string[]
    tweets: Array<{
      id: string
      text: string
      url: string
      timestamp: string
      likes: number
      retweets: number
    }>
  }
  instagram: {
    post_count: number
    post_urls: string[]
    posts: Array<{
      id: string
      type: string
      url: string
      timestamp: string
      caption: string
      likes: number
      comments: number
    }>
  }
  youtube: {
    video_count: number
    video_urls: string[]
    videos: Array<{
      id: string
      title: string
      url: string
      timestamp: string
      views: number
      likes: number
    }>
  }
}

/**
 * Component to display detailed activity information for a specific day
 * Shows contributions across different platforms
 * Respects privacy settings for each platform
 */
export default function ActivityDetails({ 
  username, 
  date, 
  onClose,
  canSync = false,
  platformFilter,
  isPublicView = false
}: ActivityDetailsProps) {
  const [activityData, setActivityData] = useState<DetailedActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  
  // Format date for display
  const formattedDate = date ? format(parseISO(date), 'MMMM d, yyyy') : ''
  
  // Fetch detailed activity data for the given date
  useEffect(() => {
    async function fetchDetailedActivity() {
      setLoading(true)
      
      try {
        const requestData = {
          username,
          date,
          isPublicView
        }
        
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch activity details: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Detailed activity data:', data)
        
        setActivityData(data.activity || null)
      } catch (err) {
        console.error('Error fetching activity details:', err)
        setError('Failed to load activity details')
      } finally {
        setLoading(false)
      }
    }
    
    fetchDetailedActivity()
  }, [date, username, isPublicView])

  // Apply animation after component mounts
  useEffect(() => {
    setIsOpen(true)
  }, [])

  // Handle closing with animation
  const handleClose = () => {
    setIsOpen(false)
    setTimeout(() => {
      onClose()
    }, 300) // Match animation duration
  }

  // Handle syncing a specific platform for this date
  const syncPlatform = async (platform: string) => {
    if (!canSync) return
    
    setSyncing(true)
    try {
      // Get user's timezone offset in minutes
      const timezoneOffsetMinutes = new Date().getTimezoneOffset();
      
      let endpoint = '/api/sync/apify';
      const body: any = { date };
      
      if (platform === 'github') {
        endpoint = '/api/sync/github';
      } else if (platform === 'youtube') {
        endpoint = '/api/sync/youtube';
      } else {
        // For twitter and instagram, still use apify endpoint
        body.platform = platform;
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-timezone-offset': timezoneOffsetMinutes.toString(),
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to sync ${platform} data`)
      }
      
      // Refresh activity details
      const detailsResponse = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          username
        }),
      })
      
      if (detailsResponse.ok) {
        const data = await detailsResponse.json()
        setActivityData(data)
      }
      
    } catch (err) {
      console.error(`Error syncing ${platform}:`, err)
      setError(`Failed to sync ${platform} data`)
    } finally {
      setSyncing(false)
    }
  }
  
  // Function to determine if a platform section should be shown
  const shouldShowPlatform = (platform: string) => {
    return !platformFilter || platformFilter === platform;
  }
  
  // Check if a platform is private
  const isPlatformPrivate = (platform: string): boolean => {
    if (!activityData?.privacy) return false;
    const key = `${platform}_private` as keyof typeof activityData.privacy;
    return activityData.privacy[key];
  }
  
  // Handle key press for ESC to close modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };
    
    // Add event listener
    document.addEventListener('keydown', handleEscKey);
    
    // Remove event listener on cleanup
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [handleClose]);
  
  return (
    <div 
      className={`fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'bg-gray-500/30' : 'bg-transparent'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto border border-gray-200 transform transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-800">
              {formattedDate}
              {platformFilter && ` - ${platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1)}`}
            </h3>
            <button
              onClick={handleClose}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1 rounded-lg flex items-center space-x-1 transition-colors"
              aria-label="Close"
            >
              <span>Close</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="bg-red-100 text-red-700 p-3 mb-4 rounded-lg border border-red-300">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Total contributions */}
              {!platformFilter && (
                <div className="bg-gray-100 p-5 rounded-lg border border-gray-200 shadow-sm">
                  <h4 className="text-lg font-medium text-gray-800 mb-2">
                    {activityData?.totalCount || 0} total contributions
                  </h4>
                  <p className="text-sm text-gray-600">
                    Last synced: {activityData?.lastSynced 
                      ? format(new Date(activityData.lastSynced), 'MMM d, yyyy h:mm a') 
                      : 'Never'}
                  </p>
                </div>
              )}
              
              {/* GitHub */}
              {shouldShowPlatform('github') && (
                <div className="bg-white p-5 rounded-lg border border-green-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-green-700">
                      GitHub: {activityData?.github.contributions || 0} contributions
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('github')}
                        disabled={syncing}
                        className={`text-xs px-3 py-1.5 rounded-lg text-white ${
                          syncing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 shadow-sm transition-colors'
                        }`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  
                  {isPlatformPrivate('github') ? (
                    <div className="bg-gray-100 p-3 rounded-lg text-center text-gray-700 border border-gray-200">
                      <p>This user has made their GitHub activity private.</p>
                    </div>
                  ) : activityData?.github.repositories.length ? (
                    <div className="space-y-2 mt-3">
                      {activityData.github.repositories.map((repo, i) => (
                        <div key={i} className="flex justify-between items-center text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <a 
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:underline truncate mr-2"
                          >
                            {repo.nameWithOwner}
                          </a>
                          <span className="text-green-700 whitespace-nowrap">
                            {repo.contributions} commits
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 mt-2">
                      No GitHub activity on this date.
                    </div>
                  )}
                </div>
              )}
              
              {/* Twitter */}
              {shouldShowPlatform('twitter') && (
                <div className="bg-white p-5 rounded-lg border border-blue-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-blue-700">
                      Twitter: {activityData?.twitter.tweet_count || 0} tweets
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('twitter')}
                        disabled={syncing}
                        className={`text-xs px-3 py-1.5 rounded-lg text-white ${
                          syncing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors'
                        }`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  
                  {isPlatformPrivate('twitter') ? (
                    <div className="bg-gray-100 p-3 rounded-lg text-center text-gray-700 border border-gray-200">
                      <p>This user has made their Twitter activity private.</p>
                    </div>
                  ) : activityData?.twitter.tweets?.length ? (
                    <div className="space-y-3 mt-3">
                      {activityData.twitter.tweets.map((tweet, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-200">
                          <p className="text-gray-800 mb-2">{tweet.text}</p>
                          <div className="flex justify-between items-center text-xs text-gray-600">
                            <span>{tweet.timestamp ? format(new Date(tweet.timestamp), 'h:mm a') : ''}</span>
                            <div className="flex space-x-3">
                              <span>{tweet.likes} likes</span>
                              <span>{tweet.retweets} retweets</span>
                              <a 
                                href={tweet.url}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="text-blue-600 hover:underline"
                              >
                                View
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 mt-2">
                      No Twitter activity on this date.
                    </div>
                  )}
                </div>
              )}
              
              {/* Instagram */}
              {shouldShowPlatform('instagram') && (
                <div className="bg-white p-5 rounded-lg border border-pink-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-pink-700">
                      Instagram: {activityData?.instagram.post_count || 0} posts
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('instagram')}
                        disabled={syncing}
                        className={`text-xs px-3 py-1.5 rounded-lg text-white ${
                          syncing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-pink-600 hover:bg-pink-700 shadow-sm transition-colors'
                        }`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  
                  {isPlatformPrivate('instagram') ? (
                    <div className="bg-gray-100 p-3 rounded-lg text-center text-gray-700 border border-gray-200">
                      <p>This user has made their Instagram activity private.</p>
                    </div>
                  ) : activityData?.instagram.posts?.length ? (
                    <div className="space-y-3 mt-3">
                      {activityData.instagram.posts.map((post, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-200">
                          <p className="text-gray-800 mb-2">{post.caption}</p>
                          <div className="flex justify-between items-center text-xs text-gray-600">
                            <span>{post.timestamp ? format(new Date(post.timestamp), 'h:mm a') : ''}</span>
                            <div className="flex space-x-3">
                              <span>{post.likes} likes</span>
                              <span>{post.comments} comments</span>
                              <a 
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="text-pink-600 hover:underline"
                              >
                                View {post.type}
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 mt-2">
                      No Instagram activity on this date.
                    </div>
                  )}
                </div>
              )}
              
              {/* YouTube */}
              {shouldShowPlatform('youtube') && (
                <div className="bg-white p-5 rounded-lg border border-red-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-red-700">
                      YouTube: {activityData?.youtube.video_count || 0} videos
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('youtube')}
                        disabled={syncing}
                        className={`text-xs px-3 py-1.5 rounded-lg text-white ${
                          syncing
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 shadow-sm transition-colors'
                        }`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  
                  {isPlatformPrivate('youtube') ? (
                    <div className="bg-gray-100 p-3 rounded-lg text-center text-gray-700 border border-gray-200">
                      <p>This user has made their YouTube activity private.</p>
                    </div>
                  ) : activityData?.youtube.videos?.length ? (
                    <div className="space-y-3 mt-3">
                      {activityData.youtube.videos.map((video, i) => (
                        <div key={i} className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-200">
                          <p className="text-gray-800 font-medium mb-1">{video.title}</p>
                          <div className="flex justify-between items-center text-xs text-gray-600">
                            <span>{video.timestamp ? format(new Date(video.timestamp), 'h:mm a') : ''}</span>
                            <div className="flex space-x-3">
                              <span>{video.views} views</span>
                              <span>{video.likes} likes</span>
                              <a 
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="text-red-600 hover:underline"
                              >
                                Watch
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 mt-2">
                      No YouTube activity on this date.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 