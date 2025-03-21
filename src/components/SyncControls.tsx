'use client'

import React from 'react'

/**
 * Component that displays sync buttons for different platforms
 * Conditionally renders buttons based on selected platform and sync status
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
      {(platform === 'all' || platform === 'github') && (
        <button
          onClick={() => syncPlatform('github')}
          disabled={syncing}
          className={`px-3 py-1 rounded-md ${getPlatformButtonClass('github')}`}
        >
          {syncing ? 'Syncing...' : 'Sync GitHub'}
        </button>
      )}
      {(platform === 'all' || platform === 'twitter') && (
        <button
          onClick={() => syncPlatform('twitter')}
          disabled={syncing}
          className={`px-3 py-1 rounded-md ${getPlatformButtonClass('twitter')}`}
        >
          {syncing ? 'Syncing...' : 'Sync Twitter'}
        </button>
      )}
      {(platform === 'all' || platform === 'instagram') && (
        <button
          onClick={() => syncPlatform('instagram')}
          disabled={syncing}
          className={`px-3 py-1 rounded-md ${getPlatformButtonClass('instagram')}`}
        >
          {syncing ? 'Syncing...' : 'Sync Instagram'}
        </button>
      )}
      {(platform === 'all' || platform === 'youtube') && (
        <button
          onClick={() => syncPlatform('youtube')}
          disabled={syncing}
          className={`px-3 py-1 rounded-md ${getPlatformButtonClass('youtube')}`}
        >
          {syncing ? 'Syncing...' : 'Sync YouTube'}
        </button>
      )}
    </div>
  )
} 