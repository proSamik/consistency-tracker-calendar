'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom') || '/dashboard';
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionStatus, setSessionStatus] = useState('Checking...');

  // Check session status on load
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionStatus(data.session ? 'Authenticated' : 'Not authenticated');
      
      // Don't auto-redirect as this conflicts with middleware
      // and creates infinite loops
    };
    
    checkSession();
  }, []);

  /**
   * Handles form submission for both sign up and sign in
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (isSignUp) {
        // Handle sign up logic
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });

        if (error) throw error;
        
        // Show success message for email verification
        alert('Check your email for the confirmation link!');
      } else {
        // Handle sign in logic
        console.log('Signing in with:', email);
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        console.log('Sign in successful, session:', !!data.session);
        
        // Force a hard navigation instead of client-side routing
        window.location.href = redirectedFrom;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setErrorMessage(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-xl">
        <div className="text-center">
          <h1 className="text-4xl font-bold">{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
          <p className="mt-2 text-gray-600">
            {isSignUp
              ? 'Create an account to track your consistency'
              : 'Sign in to your account'}
          </p>
          {redirectedFrom !== '/dashboard' && (
            <p className="mt-2 text-sm text-amber-600">
              You need to sign in to access that page
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">Session status: {sessionStatus}</p>
        </div>

        {errorMessage && (
          <div className="rounded-md bg-red-50 p-4 text-red-600">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
} 