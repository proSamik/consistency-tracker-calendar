'use client'

import React from 'react'
import { format, isSameDay, isAfter } from 'date-fns'

/**
 * Component that renders the actual calendar grid with months, days, and activity squares
 * Handles the visualization of activity data in a GitHub-style grid
 */
export default function CalendarGrid({
  months,
  weeks,
  dateRange,
  filteredActivities,
  getCellColor,
  toLocalDate,
  handleDayClick,
  loading
}: {
  months: { name: string; date: Date }[]
  weeks: Date[][]
  dateRange: { startDate: Date; endDate: Date }
  filteredActivities: any[]
  getCellColor: (count: number) => string
  toLocalDate: (dateString: string) => Date
  handleDayClick: (date: Date) => void
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    )
  }
  
  return (
    <>
      <div className="md:hidden text-xs text-gray-400 italic mb-2 text-center">
        Swipe left/right to view full calendar
      </div>
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[768px] grid grid-cols-[auto_1fr] gap-2">
          {/* Month labels */}
          <div className="col-start-2 flex">
            {months.map((month, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-400">
                {month.name}
              </div>
            ))}
          </div>
          
          {/* Day labels and cells */}
          <div className="flex flex-col justify-around h-full py-1">
            <div className="text-xs text-gray-400">Mon</div>
            <div className="text-xs text-gray-400">Wed</div>
            <div className="text-xs text-gray-400">Fri</div>
          </div>
          
          <div className="grid grid-cols-52 gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => {
                  // Find activity for this day if any
                  const activity = filteredActivities.find(a => {
                    // Convert activity date to local timezone for comparison
                    const activityDate = toLocalDate(a.date);
                    return isSameDay(activityDate, day);
                  });
                  
                  // Skip days outside our target year
                  if (day.getFullYear() !== dateRange.startDate.getFullYear()) {
                    return <div key={dayIndex} className="w-5 h-5"></div>
                  }
                  
                  const count = activity ? activity.count : 0
                  const colorClass = getCellColor(count)
                  
                  return (
                    <div
                      key={dayIndex}
                      className={`w-5 h-5 rounded-sm ${colorClass} cursor-pointer hover:opacity-80 transition-opacity`}
                      title={`${format(day, 'MMM d, yyyy')}: ${count} contributions`}
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