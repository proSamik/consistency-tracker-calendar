'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LandingPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Checks if user is authenticated on component mount
   */
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  /**
   * Handles redirection to dashboard or auth based on authentication status
   */
  const handleGetStarted = () => {
    if (isAuthenticated) {
      router.push('/dashboard');
    } else {
      router.push('/auth');
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-indigo-600">Consistency Tracker</h1>
          </div>
          <div className="space-x-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth"
                className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-5xl font-bold leading-tight text-gray-900">
            Track Your Social Media Consistency
          </h2>
          <p className="mb-10 text-xl text-gray-600">
            Manage all your social media profiles in one place. Keep track of your online presence
            across GitHub, Twitter, Instagram, and YouTube.
          </p>
          <button
            onClick={handleGetStarted}
            className="rounded-md bg-indigo-600 px-8 py-4 text-lg font-medium text-white shadow-md hover:bg-indigo-700"
          >
            Get Started
          </button>
        </div>

        <div className="mt-20 grid gap-8 md:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold">Manage Profiles</h3>
            <p className="text-gray-600">
              Store and manage all your social media usernames in one convenient dashboard.
            </p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold">Track Progress</h3>
            <p className="text-gray-600">
              Monitor your social media growth and engagement across multiple platforms.
            </p>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-md">
            <h3 className="mb-3 text-xl font-semibold">Stay Consistent</h3>
            <p className="text-gray-600">
              Build your online presence through consistent activity and engagement.
            </p>
          </div>
        </div>
      </main>

      <footer className="container mx-auto mt-20 border-t border-gray-200 px-4 py-8">
        <p className="text-center text-gray-500">
          &copy; {new Date().getFullYear()} Consistency Tracker. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
