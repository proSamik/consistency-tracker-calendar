import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

/**
 * Landing page with authentication awareness
 */
export default async function LandingPage() {
  // Get authentication status from server
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const isAuthenticated = !!data.user;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">

      <main className="container mx-auto px-4 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-6 text-5xl font-bold leading-tight text-gray-900">
            Track Your Social Media Consistency
          </h2>
          <p className="mb-10 text-xl text-gray-600">
            Manage all your social media profiles in one place. Keep track of your online presence
            across GitHub, Twitter, Instagram, and YouTube.
          </p>
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="inline-block rounded-md bg-indigo-600 px-8 py-4 text-lg font-medium text-white shadow-md hover:bg-indigo-700"
          >
            Get Started
          </Link>
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
