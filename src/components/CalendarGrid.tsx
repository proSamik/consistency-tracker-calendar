'use client'

import React from 'react'
import { format, isSameDay } from 'date-fns'

/**
 * Component that displays the calendar grid with days and months
 * Shows activity levels with color-coded cells
 */
export default function CalendarGrid({
  months,
  weeks,
  dateRange,
  filteredActivities,
  getCellColor,
  toLocalDate,
  handleDayClick,
  loading,
  platform = 'all'
}: {
  months: { name: string; date: Date }[]
  weeks: Date[][]
  dateRange: { startDate: Date; endDate: Date }
  filteredActivities: any[]
  getCellColor: (count: number) => string
  toLocalDate: (dateString: string) => Date
  handleDayClick: (date: Date) => void
  loading: boolean
  platform?: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
}) {
  if (loading) {
    return (
      <div className="animate-pulse flex flex-col gap-2">
        <div className="bg-gray-300 h-4 w-full rounded"></div>
        <div className="grid grid-cols-12 gap-1 mb-4">
          {Array(12).fill(0).map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded"></div>
          ))}
        </div>
        <div className="bg-gray-300 h-40 w-full rounded"></div>
      </div>
    )
  }

  /**
   * Get appropriate activity term based on platform and count
   * @param count Number of activities
   * @returns Appropriate term (singular or plural)
   */
  const getActivityTerm = (count: number) => {
    if (platform === 'github') {
      return count === 1 ? 'contribution' : 'contributions'
    } else if (platform === 'twitter') {
      return count === 1 ? 'tweet' : 'tweets'
    } else if (platform === 'instagram') {
      return count === 1 ? 'post' : 'posts'
    } else if (platform === 'youtube') {
      return count === 1 ? 'video' : 'videos'
    } else {
      // All Platforms
      return count === 1 ? 'activity' : 'activities'
    }
  }

  return (
    <>
      <div className="md:hidden text-xs text-gray-400 italic mb-2 text-center">
        Swipe left/right to view full calendar
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[768px] grid grid-cols-[auto_1fr] gap-3 bg-white p-4 rounded-lg">
          {/* Month labels */}
          <div className="col-start-2 flex">
            {months.map((month, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-600">
                {month.name}
              </div>
            ))}
          </div>
          
          {/* Day labels and cells */}
          <div className="flex flex-col justify-around h-full py-1">
            <div className="text-xs text-gray-600">Mon</div>
            <div className="text-xs text-gray-600">Wed</div>
            <div className="text-xs text-gray-600">Fri</div>
          </div>
          
          <div className="grid grid-cols-52 gap-x-6">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-2">
                {week.map((day, dayIndex) => {
                  // Find activity for this day if any
                  const activity = filteredActivities.find(a => {
                    // Convert activity date to local timezone for comparison
                    const activityDate = toLocalDate(a.date);
                    return isSameDay(activityDate, day);
                  });
                  
                  // Skip days outside our target year
                  if (day.getFullYear() !== dateRange.startDate.getFullYear()) {
                    return <div key={dayIndex} className="w-5 h-5 mx-0.5"></div>
                  }
                  
                  const count = activity ? activity.count : 0
                  const colorClass = getCellColor(count)
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`w-5 h-5 rounded-xs ${colorClass} cursor-pointer hover:opacity-100 hover:shadow-md hover:shadow-gray-400/30 transform hover:scale-105 transition-all duration-150`}
                      title={`${format(day, 'MMM d, yyyy')}: ${count} ${getActivityTerm(count)}`}
                      onClick={() => handleDayClick(day)}
                    ></div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
} 