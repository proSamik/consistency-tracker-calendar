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
          className={`px-3 py-1 rounded-md ${syncing ? 'bg-gray-700' : 'bg-indigo-700 hover:bg-indigo-600'}`}
        >
          {syncing ? 'Syncing...' : 'Sync All Platforms'}
        </button>
      ) : (
        // Show a single platform-specific button when a specific platform is selected
        <button
          onClick={() => syncPlatform(platform)}
          disabled={syncing}
          className={`px-3 py-1 rounded-md ${getPlatformButtonClass(platform)}`}
        >
          {syncing ? 'Syncing...' : `Sync ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
        </button>
      )}
    </div>
  )
} 