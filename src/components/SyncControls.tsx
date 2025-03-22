'use client'

import React from 'react'

/**
 * Component that displays sync buttons for different platforms
 * Shows a single "Sync All" button for all platforms or individual platform buttons
 */
export default function SyncControls({
  platform = 'all',
  syncing = false,
  syncPlatform,
  getPlatformButtonClass
}: {
  platform: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
  syncing: boolean
  syncPlatform: (platform: string) => Promise<void>
  getPlatformButtonClass: (platform: string) => string
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {platform === 'all' ? (
        // Show a single "Sync All" button when platform is 'all'
        <button
          onClick={() => syncPlatform('all')}
          disabled={syncing}
          className={`px-4 py-2 rounded-lg font-medium text-white ${syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-200'}`}
        >
          {syncing ? 'Syncing...' : 'Sync All Platforms'}
        </button>
      ) : (
        // Show a single platform-specific button when a specific platform is selected
        <button
          onClick={() => syncPlatform(platform)}
          disabled={syncing}
          className={`px-4 py-2 rounded-lg font-medium ${getPlatformButtonClass(platform)} transition-all duration-200`}
        >
          {syncing ? 'Syncing...' : `Sync ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
        </button>
      )}
    </div>
  )
} 