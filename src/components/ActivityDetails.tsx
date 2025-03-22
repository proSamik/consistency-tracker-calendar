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
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">
              {formattedDate}
              {platformFilter && ` - ${platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1)}`}
            </h3>
            <button
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded flex items-center space-x-1"
              aria-label="Close"
            >
              <span>Close</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="bg-red-900 text-white p-2 mb-4 rounded">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Total contributions */}
              {!platformFilter && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-white mb-2">
                    {activityData?.totalCount || 0} total contributions
                  </h4>
                  <p className="text-sm text-gray-400">
                    Last synced: {activityData?.lastSynced 
                      ? format(new Date(activityData.lastSynced), 'MMM d, yyyy h:mm a') 
                      : 'Never'}
                  </p>
                </div>
              )}
              
              {/* GitHub */}
              {shouldShowPlatform('github') && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-green-400">
                      GitHub: {activityData?.github.contributions || 0} contributions
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('github')}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded ${
                          syncing
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-green-700 hover:bg-green-600'
                        }`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  
                  {isPlatformPrivate('github') ? (
                    <div className="bg-gray-700 p-3 rounded text-center text-gray-300">
                      <p>This user has made their GitHub activity private.</p>
                    </div>
                  ) : activityData?.github.repositories.length ? (
                    <div className="space-y-2 mt-2">
                      {activityData.github.repositories.map((repo, i) => (
                        <div key={i} className="flex justify-between items-center text-sm bg-gray-700 p-2 rounded">
                          <a 
                            href={repo.url}
                            target="_blank"
                            rel="noopener noreferrer" 
                            className="text-blue-400 hover:underline truncate mr-2"
                          >
                            {repo.nameWithOwner}
                          </a>
                          <span className="text-green-400 whitespace-nowrap">
                            {repo.contributions} commits
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 mt-2">
                      No GitHub activity on this date.
                    </div>
                  )}
                </div>
              )}
              
              {/* Twitter */}
              {shouldShowPlatform('twitter') && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-blue-400">
                      Twitter: {activityData?.twitter.tweet_count || 0} tweets
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('twitter')}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded ${
                          syncing
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-blue-700 hover:bg-blue-600'
                        }`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  
                  {isPlatformPrivate('twitter') ? (
                    <div className="bg-gray-700 p-3 rounded text-center text-gray-300">
                      <p>This user has made their Twitter activity private.</p>
                    </div>
                  ) : activityData?.twitter.tweets?.length ? (
                    <div className="space-y-3 mt-2">
                      {activityData.twitter.tweets.map((tweet, i) => (
                        <div key={i} className="bg-gray-700 p-3 rounded text-sm">
                          <p className="text-gray-200 mb-2">{tweet.text}</p>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>{tweet.timestamp ? format(new Date(tweet.timestamp), 'h:mm a') : ''}</span>
                            <div className="flex space-x-3">
                              <span>{tweet.likes} likes</span>
                              <span>{tweet.retweets} retweets</span>
                              <a 
                                href={tweet.url}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="text-blue-400 hover:underline"
                              >
                                View
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 mt-2">
                      No Twitter activity on this date.
                    </div>
                  )}
                </div>
              )}
              
              {/* Instagram */}
              {shouldShowPlatform('instagram') && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-pink-400">
                      Instagram: {activityData?.instagram.post_count || 0} posts
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('instagram')}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded ${
                          syncing
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-pink-700 hover:bg-pink-600'
                        }`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  
                  {isPlatformPrivate('instagram') ? (
                    <div className="bg-gray-700 p-3 rounded text-center text-gray-300">
                      <p>This user has made their Instagram activity private.</p>
                    </div>
                  ) : activityData?.instagram.posts?.length ? (
                    <div className="space-y-3 mt-2">
                      {activityData.instagram.posts.map((post, i) => (
                        <div key={i} className="bg-gray-700 p-3 rounded text-sm">
                          <p className="text-gray-200 mb-2">{post.caption}</p>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>{post.timestamp ? format(new Date(post.timestamp), 'h:mm a') : ''}</span>
                            <div className="flex space-x-3">
                              <span>{post.likes} likes</span>
                              <span>{post.comments} comments</span>
                              <a 
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="text-pink-400 hover:underline"
                              >
                                View {post.type}
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 mt-2">
                      No Instagram activity on this date.
                    </div>
                  )}
                </div>
              )}
              
              {/* YouTube */}
              {shouldShowPlatform('youtube') && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-red-400">
                      YouTube: {activityData?.youtube.video_count || 0} videos
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('youtube')}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded ${
                          syncing
                            ? 'bg-gray-700 cursor-not-allowed'
                            : 'bg-red-700 hover:bg-red-600'
                        }`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  
                  {isPlatformPrivate('youtube') ? (
                    <div className="bg-gray-700 p-3 rounded text-center text-gray-300">
                      <p>This user has made their YouTube activity private.</p>
                    </div>
                  ) : activityData?.youtube.videos?.length ? (
                    <div className="space-y-3 mt-2">
                      {activityData.youtube.videos.map((video, i) => (
                        <div key={i} className="bg-gray-700 p-3 rounded text-sm">
                          <p className="text-gray-200 font-medium mb-1">{video.title}</p>
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>{video.timestamp ? format(new Date(video.timestamp), 'h:mm a') : ''}</span>
                            <div className="flex space-x-3">
                              <span>{video.views} views</span>
                              <span>{video.likes} likes</span>
                              <a 
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer" 
                                className="text-red-400 hover:underline"
                              >
                                Watch
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 mt-2">
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