'use client'

import React from 'react'

/**
 * Component that displays the color legend for the calendar
 * Shows different color intensities based on the selected platform
 */
export default function CalendarLegend({
  platform = 'all'
}: {
  platform: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
}) {
  return (
    <div className="mt-4 flex items-center justify-center text-sm">
      <span className="mr-2">Less</span>
      <div className="flex gap-1">
        <div className="w-4 h-4 bg-gray-800 rounded-sm"></div>
        {platform === 'github' && (
          <>
            <div className="w-4 h-4 bg-green-900 rounded-sm"></div>
            <div className="w-4 h-4 bg-green-700 rounded-sm"></div>
            <div className="w-4 h-4 bg-green-600 rounded-sm"></div>
            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
          </>
        )}
        {platform === 'twitter' && (
          <>
            <div className="w-4 h-4 bg-blue-900 rounded-sm"></div>
            <div className="w-4 h-4 bg-blue-700 rounded-sm"></div>
            <div className="w-4 h-4 bg-blue-600 rounded-sm"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
          </>
        )}
        {platform === 'instagram' && (
          <>
            <div className="w-4 h-4 bg-pink-900 rounded-sm"></div>
            <div className="w-4 h-4 bg-pink-700 rounded-sm"></div>
            <div className="w-4 h-4 bg-pink-600 rounded-sm"></div>
            <div className="w-4 h-4 bg-pink-500 rounded-sm"></div>
          </>
        )}
        {platform === 'youtube' && (
          <>
            <div className="w-4 h-4 bg-red-900 rounded-sm"></div>
            <div className="w-4 h-4 bg-red-700 rounded-sm"></div>
            <div className="w-4 h-4 bg-red-600 rounded-sm"></div>
            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
          </>
        )}
        {platform === 'all' && (
          <>
            <div className="w-4 h-4 bg-emerald-900 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-700 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-600 rounded-sm"></div>
            <div className="w-4 h-4 bg-emerald-500 rounded-sm"></div>
          </>
        )}
      </div>
      <span className="ml-2">More</span>
    </div>
  )
} 