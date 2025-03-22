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
    <div className="mt-6 flex items-center justify-center text-sm">
      <span className="mr-2 text-gray-700">Less</span>
      <div className="flex gap-2">
        <div className="w-5 h-5 bg-gray-200 border border-gray-300 rounded-md"></div>
        {platform === 'github' && (
          <>
            <div className="w-5 h-5 bg-green-300 border border-green-400 rounded-md shadow-sm shadow-green-400/50"></div>
            <div className="w-5 h-5 bg-green-500 border border-green-600 rounded-md shadow-sm shadow-green-500/50"></div>
            <div className="w-5 h-5 bg-green-600 border border-green-700 rounded-md shadow-sm shadow-green-600/50"></div>
            <div className="w-5 h-5 bg-green-700 border border-green-800 rounded-md shadow-sm shadow-green-700/50"></div>
          </>
        )}
        {platform === 'twitter' && (
          <>
            <div className="w-5 h-5 bg-blue-300 border border-blue-400 rounded-md shadow-sm shadow-blue-400/50"></div>
            <div className="w-5 h-5 bg-blue-500 border border-blue-600 rounded-md shadow-sm shadow-blue-500/50"></div>
            <div className="w-5 h-5 bg-blue-600 border border-blue-700 rounded-md shadow-sm shadow-blue-600/50"></div>
            <div className="w-5 h-5 bg-blue-700 border border-blue-800 rounded-md shadow-sm shadow-blue-700/50"></div>
          </>
        )}
        {platform === 'instagram' && (
          <>
            <div className="w-5 h-5 bg-pink-300 border border-pink-400 rounded-md shadow-sm shadow-pink-400/50"></div>
            <div className="w-5 h-5 bg-pink-500 border border-pink-600 rounded-md shadow-sm shadow-pink-500/50"></div>
            <div className="w-5 h-5 bg-pink-600 border border-pink-700 rounded-md shadow-sm shadow-pink-600/50"></div>
            <div className="w-5 h-5 bg-pink-700 border border-pink-800 rounded-md shadow-sm shadow-pink-700/50"></div>
          </>
        )}
        {platform === 'youtube' && (
          <>
            <div className="w-5 h-5 bg-red-300 border border-red-400 rounded-md shadow-sm shadow-red-400/50"></div>
            <div className="w-5 h-5 bg-red-500 border border-red-600 rounded-md shadow-sm shadow-red-500/50"></div>
            <div className="w-5 h-5 bg-red-600 border border-red-700 rounded-md shadow-sm shadow-red-600/50"></div>
            <div className="w-5 h-5 bg-red-700 border border-red-800 rounded-md shadow-sm shadow-red-700/50"></div>
          </>
        )}
        {platform === 'all' && (
          <>
            <div className="w-5 h-5 bg-purple-300 border border-purple-400 rounded-md shadow-sm shadow-purple-400/50"></div>
            <div className="w-5 h-5 bg-purple-500 border border-purple-600 rounded-md shadow-sm shadow-purple-500/50"></div>
            <div className="w-5 h-5 bg-purple-600 border border-purple-700 rounded-md shadow-sm shadow-purple-600/50"></div>
            <div className="w-5 h-5 bg-purple-700 border border-purple-800 rounded-md shadow-sm shadow-purple-700/50"></div>
          </>
        )}
      </div>
      <span className="ml-2 text-gray-700">More</span>
    </div>
  )
} 