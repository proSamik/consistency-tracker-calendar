'use client'

import React from 'react'

/**
 * Component that displays the header section of the calendar
 * Shows the title and year selector
 */
export default function CalendarHeader({
  filteredActivities,
  getPlatformTitle,
  dateRange,
}: {
  filteredActivities: any[]
  getPlatformTitle: string
  dateRange: { startDate: Date; endDate: Date }
  yearOffset: number
  changeYear: (offset: number) => void
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
      <h2 className="text-xl font-bold text-gray-800">
        {filteredActivities.length > 0 
          ? `${filteredActivities.reduce((sum, a) => sum + a.count, 0)} ${getPlatformTitle} contributions in ${dateRange.startDate.getFullYear()}`
          : `${getPlatformTitle} Calendar`}
      </h2>
      
      {/* Year selector - Display only 2025 for now */}
      <div className="relative w-full sm:w-auto max-w-xs">
        <div className="flex items-center justify-between space-x-2 bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 shadow-sm">
          <span className="text-sm font-medium text-gray-700">Year:</span>
          <span className="text-sm font-bold px-2 py-1 bg-blue-600 text-white rounded-md">2025</span>
        </div>
        {/* We'll uncomment and use this slider when more years are added 
        <input 
          type="range" 
          min="0" 
          max="0" 
          value={yearOffset} 
          onChange={(e) => changeYear(Number(e.target.value))}
          className="w-full h-1 mt-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
        />
        */}
      </div>
    </div>
  )
} 