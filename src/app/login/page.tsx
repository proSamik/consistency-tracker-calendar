'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, signup } from './actions'

/**
 * Inner login form component that uses search params
 */
function LoginForm() {
  const searchParams = useSearchParams()
  const [isSignupMode, setIsSignupMode] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Check for error messages in URL
  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'username_taken') {
      setIsSignupMode(true)
      setFormError('This username is already taken. Please choose another one.')
    }
  }, [searchParams])
  
  /**
   * Check username availability on blur
   */
  const checkUsername = async (e: React.FocusEvent<HTMLInputElement>) => {
    const username = e.target.value.trim()
    if (!username) {
      setUsernameError('Username is required')
      return
    }
    
    try {
      const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`, {
        method: 'GET'
      })
      
      if (!response.ok) {
        const data = await response.json()
        setUsernameError(data.error || 'Error checking username')
      } else {
        setUsernameError(null)
      }
    } catch (error) {
      console.error('Error checking username:', error)
      setUsernameError('Error checking username availability')
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex justify-center items-center py-12">
      <div className="w-full max-w-md p-8 bg-white shadow-md rounded-lg">
        <div className="flex justify-center mb-6">
          <div className="flex space-x-2 border rounded-lg overflow-hidden">
            <button 
              className={`px-4 py-2 ${!isSignupMode ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
              onClick={() => {
                setIsSignupMode(false)
                setFormError(null)
              }}
              type="button"
            >
              Login
            </button>
            <button 
              className={`px-4 py-2 ${isSignupMode ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
              onClick={() => {
                setIsSignupMode(true)
                setFormError(null)
              }}
              type="button"
            >
              Sign Up
            </button>
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-6 text-center text-indigo-600">
          {isSignupMode ? 'Create Account' : 'Welcome Back'}
        </h1>
        
        {formError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {formError}
          </div>
        )}
        
        {/* Login Form */}
        {!isSignupMode && (
          <form action={login}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="login-email">
                Email:
              </label>
              <input 
                id="login-email" 
                name="email" 
                type="email" 
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" 
                required 
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="login-password">
                Password:
              </label>
              <input 
                id="login-password" 
                name="password" 
                type="password" 
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" 
                required 
              />
            </div>
            
            <div className="flex items-center justify-center">
              <button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none w-full" 
                type="submit"
              >
                Log in
              </button>
            </div>
          </form>
        )}
        
        {/* Signup Form */}
        {isSignupMode && (
          <form action={signup}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-email">
                Email:
              </label>
              <input 
                id="signup-email" 
                name="email" 
                type="email" 
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" 
                required 
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-username">
                Username: <span className="text-red-500">*</span>
              </label>
              <input 
                id="signup-username" 
                name="username" 
                type="text" 
                className={`shadow appearance-none border ${usernameError || formError ? 'border-red-500' : ''} rounded w-full py-2 px-3 text-gray-700`}
                onBlur={checkUsername}
                required 
              />
              {usernameError && (
                <p className="text-red-500 text-xs mt-1">{usernameError}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">Username must be unique and cannot be changed later.</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-fullname">
                Full Name:
              </label>
              <input 
                id="signup-fullname" 
                name="fullName" 
                type="text" 
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" 
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-password">
                Password:
              </label>
              <input 
                id="signup-password" 
                name="password" 
                type="password" 
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" 
                required 
              />
            </div>
            
            <div className="mb-6">
              <h3 className="block text-gray-700 text-sm font-bold mb-2">Social Media Profiles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-xs mb-1" htmlFor="github">GitHub:</label>
                  <input 
                    id="github" 
                    name="github_username" 
                    type="text" 
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-xs mb-1" htmlFor="twitter">Twitter:</label>
                  <input 
                    id="twitter" 
                    name="twitter_username" 
                    type="text" 
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-xs mb-1" htmlFor="instagram">Instagram:</label>
                  <input 
                    id="instagram" 
                    name="instagram_username" 
                    type="text" 
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 text-sm" 
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-xs mb-1" htmlFor="youtube">YouTube:</label>
                  <input 
                    id="youtube" 
                    name="youtube_username" 
                    type="text" 
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 text-sm" 
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none w-full"
                type="submit"
                disabled={!!usernameError}
              >
                Create Account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/**
 * Login page component with separate login and signup forms
 * Signup form includes additional profile information fields
 */
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex justify-center items-center py-12">
        <div className="w-full max-w-md p-8 bg-white shadow-md rounded-lg text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
} 