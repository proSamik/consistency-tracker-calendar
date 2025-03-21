'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'

interface ActivityDetailsProps {
  username: string
  date: string
  onClose: () => void
  canSync?: boolean
  platformFilter?: 'github' | 'twitter' | 'instagram' | 'youtube'
}

interface DetailedActivity {
  date: string
  username: string
  totalCount: number
  lastSynced: string
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
 */
export default function ActivityDetails({ 
  username, 
  date, 
  onClose,
  canSync = false,
  platformFilter
}: ActivityDetailsProps) {
  const [activityData, setActivityData] = useState<DetailedActivity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  
  // Format date for display
  const formattedDate = date ? format(parseISO(date), 'MMMM d, yyyy') : ''
  
  // Fetch detailed activity data
  useEffect(() => {
    async function fetchDetails() {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date,
            username
          }),
        })
        
        if (response.status === 404) {
          // No activity found, return empty data
          setActivityData({
            date,
            username,
            totalCount: 0,
            lastSynced: new Date().toISOString(),
            github: { contributions: 0, repositories: [] },
            twitter: { tweet_count: 0, tweet_urls: [], tweets: [] },
            instagram: { post_count: 0, post_urls: [], posts: [] },
            youtube: { video_count: 0, video_urls: [], videos: [] }
          })
          return
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch activity details')
        }
        
        const data = await response.json()
        setActivityData(data)
      } catch (err) {
        console.error('Error fetching activity details:', err)
        setError('Failed to load activity details')
      } finally {
        setLoading(false)
      }
    }
    
    if (date) {
      fetchDetails()
    }
  }, [date, username])

  // Handle syncing a specific platform for this date
  const syncPlatform = async (platform: string) => {
    if (!canSync) return
    
    setSyncing(true)
    try {
      // Get user's timezone offset in minutes
      const timezoneOffsetMinutes = new Date().getTimezoneOffset();
      
      let endpoint = '/api/sync/apify';
      let body: any = { date };
      
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
                    <h4 className="text-lg font-medium text-white">
                      GitHub ({activityData?.github?.contributions || 0})
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('github')}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-green-700 hover:bg-green-600'}`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  {activityData?.github?.repositories && activityData.github.repositories.length > 0 ? (
                    <ul className="space-y-2">
                      {activityData.github.repositories.map((repo, i) => (
                        <li key={i} className="border-l-2 border-green-500 pl-3">
                          <a 
                            href={repo.url}
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300"
                          >
                            {repo.nameWithOwner}
                          </a>
                          <p className="text-sm text-gray-400">
                            {repo.contributions} contribution{repo.contributions !== 1 ? 's' : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No GitHub contributions on this day.</p>
                  )}
                </div>
              )}
              
              {/* Twitter */}
              {shouldShowPlatform('twitter') && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-white">
                      Twitter ({activityData?.twitter?.tweet_count || 0})
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('twitter')}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-blue-700 hover:bg-blue-600'}`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  {activityData?.twitter?.tweets && activityData.twitter.tweets.length > 0 ? (
                    <ul className="space-y-3">
                      {activityData.twitter.tweets.map((tweet, i) => (
                        <li key={i} className="border-l-2 border-blue-500 pl-3">
                          <p className="text-gray-300">{tweet.text.substring(0, 100)}...</p>
                          <div className="flex space-x-4 mt-1 text-sm text-gray-400">
                            <span>{tweet.likes} likes</span>
                            <span>{tweet.retweets} retweets</span>
                            <a 
                              href={tweet.url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              View Tweet
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No tweets on this day.</p>
                  )}
                </div>
              )}
              
              {/* Instagram */}
              {shouldShowPlatform('instagram') && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-white">
                      Instagram ({activityData?.instagram?.post_count || 0})
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('instagram')}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-pink-700 hover:bg-pink-600'}`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  {activityData?.instagram?.posts && activityData.instagram.posts.length > 0 ? (
                    <ul className="space-y-3">
                      {activityData.instagram.posts.map((post, i) => (
                        <li key={i} className="border-l-2 border-pink-500 pl-3">
                          <p className="text-gray-300">
                            {post.caption ? post.caption.substring(0, 100) + '...' : 'No caption'}
                          </p>
                          <div className="flex space-x-4 mt-1 text-sm text-gray-400">
                            <span>{post.likes} likes</span>
                            <span>{post.comments} comments</span>
                            <span>Type: {post.type}</span>
                            <a 
                              href={post.url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              View Post
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No Instagram posts on this day.</p>
                  )}
                </div>
              )}
              
              {/* YouTube */}
              {shouldShowPlatform('youtube') && (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-medium text-white">
                      YouTube ({activityData?.youtube?.video_count || 0})
                    </h4>
                    {canSync && (
                      <button
                        onClick={() => syncPlatform('youtube')}
                        disabled={syncing}
                        className={`text-xs px-2 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-red-700 hover:bg-red-600'}`}
                      >
                        {syncing ? 'Syncing...' : 'Sync'}
                      </button>
                    )}
                  </div>
                  {activityData?.youtube?.videos && activityData.youtube.videos.length > 0 ? (
                    <ul className="space-y-3">
                      {activityData.youtube.videos.map((video, i) => (
                        <li key={i} className="border-l-2 border-red-500 pl-3">
                          <p className="text-gray-300">{video.title}</p>
                          <div className="flex space-x-4 mt-1 text-sm text-gray-400">
                            <span>{video.views} views</span>
                            <span>{video.likes} likes</span>
                            <a 
                              href={video.url}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              Watch Video
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-400">No YouTube videos on this day.</p>
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