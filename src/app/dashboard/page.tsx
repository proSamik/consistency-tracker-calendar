'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type UserProfile = {
  id: string;
  email: string;
  github_username: string | null;
  twitter_username: string | null;
  instagram_username: string | null;
  youtube_username: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    github_username: '',
    twitter_username: '',
    instagram_username: '',
    youtube_username: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  /**
   * Fetches the current user and their profile data
   */
  const fetchUserProfile = async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth');
        return;
      }
      
      // Get user profile data
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        setUser(data as UserProfile);
        setFormData({
          github_username: data.github_username || '',
          twitter_username: data.twitter_username || '',
          instagram_username: data.instagram_username || '',
          youtube_username: data.youtube_username || '',
        });
      } else {
        // Create user profile if it doesn't exist
        const newUser = {
          id: session.user.id,
          email: session.user.email,
          github_username: '',
          twitter_username: '',
          instagram_username: '',
          youtube_username: '',
        };
        
        const { error: insertError } = await supabase
          .from('users')
          .insert(newUser);
          
        if (insertError) throw insertError;
        
        setUser(newUser as UserProfile);
      }
    } catch (error: any) {
      console.error('Error fetching user profile:', error.message);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Updates user profile with form data
   */
  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!user) return;
      
      const { error } = await supabase
        .from('users')
        .update(formData)
        .eq('id', user.id);
        
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Error updating profile:', error.message);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles user sign out
   */
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Load user data on component mount
  useEffect(() => {
    fetchUserProfile();
  }, []);

  if (loading && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          >
            Sign Out
          </button>
        </div>

        {message.text && (
          <div
            className={`mb-6 rounded-md p-4 ${
              message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="rounded-xl bg-white p-6 shadow-md">
          <h2 className="mb-6 text-2xl font-semibold">Your Social Media Profiles</h2>
          
          <form onSubmit={updateProfile} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="github_username" className="block text-sm font-medium text-gray-700">
                  GitHub Username
                </label>
                <input
                  id="github_username"
                  name="github_username"
                  type="text"
                  value={formData.github_username}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="twitter_username" className="block text-sm font-medium text-gray-700">
                  Twitter Username
                </label>
                <input
                  id="twitter_username"
                  name="twitter_username"
                  type="text"
                  value={formData.twitter_username}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="instagram_username" className="block text-sm font-medium text-gray-700">
                  Instagram Username
                </label>
                <input
                  id="instagram_username"
                  name="instagram_username"
                  type="text"
                  value={formData.instagram_username}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="youtube_username" className="block text-sm font-medium text-gray-700">
                  YouTube Username
                </label>
                <input
                  id="youtube_username"
                  name="youtube_username"
                  type="text"
                  value={formData.youtube_username}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 