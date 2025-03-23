'use client'

import React from 'react'
import { format } from 'date-fns'

interface StreakInfo {
  currentStreak: number
  longestStreak: number
  currentStreakStart?: Date
  currentStreakEnd?: Date
  longestStreakStart?: Date
  longestStreakEnd?: Date
}

/**
 * Component that displays current and longest streak information
 * Shows streak counts and date ranges in a card layout
 */
export default function StreakWidget({
  streakInfo,
  platform = 'all'
}: {
  streakInfo: StreakInfo
  platform: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
}) {
  const getPlatformColor = () => {
    switch(platform) {
      case 'github': return 'from-green-600 to-green-800 border-green-500';
      case 'twitter': return 'from-blue-600 to-blue-800 border-blue-500';
      case 'instagram': return 'from-pink-600 to-pink-800 border-pink-500';
      case 'youtube': return 'from-red-600 to-red-800 border-red-500';
      default: return 'from-purple-600 to-purple-700 border-purple-500';
    }
  }

  // Format the date range for display
  const formatDateRange = (startDate?: Date, endDate?: Date) => {
    if (!startDate || !endDate) return 'N/A';
    return `${format(startDate, 'd MMM yyyy')} - ${format(endDate, 'd MMM yyyy')}`;
  }

  // Get platform-specific term for consistency
  const getConsistencyTerm = () => {
    switch(platform) {
      case 'github': return 'contributions';
      case 'twitter': return 'tweets';
      case 'instagram': return 'posts';
      case 'youtube': return 'videos';
      default: return 'activities';
    }
  }

  return (
    <div className="mb-6 bg-white rounded-lg overflow-hidden text-gray-800 shadow-sm border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* Total Contributions */}
        <div className="p-4 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold">{streakInfo.currentStreak + streakInfo.longestStreak}</div>
          <div className="text-sm text-gray-600">Total {getConsistencyTerm()}</div>
          <div className="text-xs text-gray-500">3 Nov 2020 - Present</div>
        </div>

        {/* Current Streak */}
        <div className="p-4 flex flex-col items-center justify-center relative">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className={`h-20 w-20 rounded-full bg-gradient-to-b ${getPlatformColor()} flex items-center justify-center border-2 text-white`}>
              <span className="text-2xl font-bold">{streakInfo.currentStreak}</span>
            </div>
          </div>
          <div className="mb-24 text-sm text-gray-600">Current Streak</div>
          <div className="text-xs text-gray-500 mt-auto">
            {formatDateRange(streakInfo.currentStreakStart, streakInfo.currentStreakEnd)}
          </div>
        </div>

        {/* Longest Streak */}
        <div className="p-4 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold">{streakInfo.longestStreak}</div>
          <div className="text-sm text-gray-600">Longest Streak</div>
          <div className="text-xs text-gray-500">
            {formatDateRange(streakInfo.longestStreakStart, streakInfo.longestStreakEnd)}
          </div>
        </div>
      </div>
    </div>
  )
} 