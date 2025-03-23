'use client'

import React, { useState } from 'react'
import { format } from 'date-fns'

/**
 * Component that displays sync buttons for different platforms
 * Shows a single "Sync All" button for all platforms or individual platform buttons
 * Includes a date selector to sync data for a specific date
 */
export default function SyncControls({
  platform = 'all',
  syncing = false,
  syncPlatform,
  getPlatformButtonClass
}: {
  platform: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
  syncing: boolean
  syncPlatform: (platform: string, date?: string) => Promise<void>
  getPlatformButtonClass: (platform: string) => string
}) {
  // State for the selected date, default to today
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  /**
   * Handle sync button click
   * @param platform Platform to sync
   */
  const handleSync = (platform: string) => {
    syncPlatform(platform, selectedDate)
  }

  /**
   * Handle date change event
   * @param e Change event
   */
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value)
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {/* Date selector */}
      <div className="flex items-center">
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          max={format(new Date(), 'yyyy-MM-dd')} // Prevent selecting future dates
        />
      </div>

      {platform === 'all' ? (
        // Show a single "Sync All" button when platform is 'all'
        <button
          onClick={() => handleSync('all')}
          disabled={syncing}
          className={`px-4 py-2 rounded-lg font-medium text-white ${syncing ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg transition-all duration-200'}`}
        >
          {syncing ? 'Syncing...' : 'Sync All Platforms'}
        </button>
      ) : (
        // Show a single platform-specific button when a specific platform is selected
        <button
          onClick={() => handleSync(platform)}
          disabled={syncing}
          className={`px-4 py-2 rounded-lg font-medium ${getPlatformButtonClass(platform)} transition-all duration-200`}
        >
          {syncing ? 'Syncing...' : `Sync ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
        </button>
      )}
    </div>
  )
} 