import React from 'react';
import Link from 'next/link';

/**
 * Calendar preview component showing the calendar visualization
 * and related descriptive content
 */
export default function CalendarPreviewSection(): React.ReactElement {
  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-16">
        <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Visualize Your Consistency
            </h2>
            <p className="mt-3 max-w-3xl text-lg text-gray-500">
              Our consistency calendar gives you a beautiful visualization of your content creation habits 
              across multiple platforms.
            </p>
            <div className="mt-8 sm:flex">
              <div className="rounded-md shadow">
                <Link href="/login" className="flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                  Start Tracking Today
                </Link>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Build habits that last</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Visualize your progress and build consistent content creation habits.
                  </p>
                </div>
              </div>
              <div className="flex items-center mt-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Share your progress</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Share your consistency calendar with your audience and showcase your dedication.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 lg:mt-0">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-6 py-8 bg-indigo-600 sm:p-10 sm:pb-6">
                <div className="grid grid-cols-7 gap-1">
                  {Array(35).fill(0).map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-full aspect-square rounded-sm ${
                        Math.random() > 0.6 
                          ? 'bg-indigo-300' 
                          : Math.random() > 0.3 
                            ? 'bg-indigo-400' 
                            : Math.random() > 0.15 
                              ? 'bg-indigo-500' 
                              : 'bg-indigo-700'
                      }`}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="px-6 pt-6 pb-8 bg-white sm:p-10 sm:pt-6">
                <div className="mt-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Consistency Calendar
                  </h3>
                  <p className="mt-2 text-base text-gray-500">
                    Track your activity across GitHub, X, Instagram, and YouTube.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 