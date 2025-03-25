import React from 'react';
import Link from 'next/link';

/**
 * Hero section component with title, description, call-to-action buttons and video demo
 * Displays at the top of the landing page
 */
export default function HeroSection(): React.ReactElement {
  return (
    <div className="relative py-24 px-6 sm:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-indigo-600 mb-4">
            Build Your Consistency Habit
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-600 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Track and showcase your content creation consistency across multiple platforms 
            with our beautiful calendar visualization.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/login" className="px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10">
              Get Started
            </Link>
            <Link href="/dashboard" className="ml-4 px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10">
              Dashboard
            </Link>
          </div>
          
          {/* Video Demo Section */}
          <div className="mt-12 max-w-3xl mx-auto">
            <div className="relative w-full overflow-hidden rounded-xl shadow-lg" style={{ paddingBottom: '56.25%' }}>
              <iframe 
                className="absolute top-0 left-0 w-full h-full border-0"
                src="https://www.youtube.com/embed/cn8MsmLzOQQ" 
                title="Consistency Calendar Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
              />
            </div>
            <p className="mt-3 text-sm text-gray-500">
              Watch our demo to see how the Consistency Calendar works
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 