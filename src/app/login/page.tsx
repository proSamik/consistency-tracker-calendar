'use client'

import { useState, useEffect, FormEvent, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { login, signup } from './actions'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  username_taken: 'This username is already taken. Please choose another one.',
  missing_fields: 'Please fill in all required fields.',
  invalid_credentials: 'The email or password you entered is incorrect.',
  email_not_verified: 'Please verify your email address before logging in.',
  too_many_attempts: 'Too many login attempts. Please try again later.',
  invalid_email: 'Please enter a valid email address.',
  auth_error: 'Authentication failed. Please try again.',
  invalid_username: 'The username format is invalid.',
  weak_password: 'The password does not meet the requirements.',
  email_in_use: 'An account with this email already exists. Please log in instead.',
  invalid_password: 'The password you entered is invalid.',
  signup_failed: 'Account creation failed. Please try again.',
  profile_creation_failed: 'Account created but profile setup failed. Please contact support.'
};

/**
 * Inner login form component that uses search params
 */
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSignupMode, setIsSignupMode] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  
  // Check for error messages in URL
  useEffect(() => {
    const error = searchParams.get('error')
    const details = searchParams.get('details')
    const registration = searchParams?.get('registration')
    const email = searchParams?.get('email')
    
    // Handle registration success
    if (registration === 'success' && email) {
      setRegistrationSuccess(true)
      setRegisteredEmail(email)
      setIsSignupMode(false) // Switch to login mode
    }
    
    if (error) {
      // Show signup form for signup-related errors
      if (['username_taken', 'invalid_username', 'weak_password', 'email_in_use'].includes(error)) {
        setIsSignupMode(true)
      }
      
      // Set main form error
      setFormError(ERROR_MESSAGES[error] || 'An error occurred. Please try again.')
      
      // Set field-specific errors based on error code
      if (error === 'invalid_username' && details) {
        setUsernameError(details)
      } else if (error === 'weak_password' && details) {
        setPasswordError(details)
      } else if (error === 'email_in_use') {
        setEmailError('An account with this email already exists')
      } else if (error === 'invalid_email') {
        setEmailError('Please enter a valid email address')
      } else if (error === 'invalid_credentials') {
        setPasswordError('The email or password you entered is incorrect')
      }
    }
  }, [searchParams])
  
  /**
   * Validates a username based on the following rules:
   * - Cannot start with a number
   * - Cannot contain special characters
   * - Should be lowercase letters followed by optional numbers
   */
  const validateUsername = (username: string): string | null => {
    if (!username.trim()) {
      return 'Username is required'
    }
    
    // Check if username starts with a number
    if (/^[0-9]/.test(username)) {
      return 'Username cannot start with a number'
    }
    
    // Check if username contains only lowercase letters and numbers
    if (!/^[a-z][a-z0-9]*$/.test(username)) {
      return 'Username can only contain lowercase letters and numbers'
    }
    
    return null
  }
  
  /**
   * Validates a password based on the following rules:
   * - At least 8 characters
   * - Contains at least one lowercase letter
   * - Contains at least one uppercase letter
   * - Contains at least one number
   * - Contains at least one special character
   */
  const validatePassword = (password: string): string | null => {
    if (!password) {
      return 'Password is required'
    }
    
    // Check length
    if (password.length < 8) {
      return 'Password must be at least 8 characters'
    }
    
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      return 'Password must include a lowercase letter'
    }
    
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      return 'Password must include an uppercase letter'
    }
    
    // Check for number
    if (!/[0-9]/.test(password)) {
      return 'Password must include a number'
    }
    
    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must include a special character'
    }
    
    return null
  }
  
  /**
   * Check username availability on blur
   */
  const checkUsername = async (e: React.FocusEvent<HTMLInputElement>) => {
    const username = e.target.value.trim()
    const validationError = validateUsername(username)
    
    if (validationError) {
      setUsernameError(validationError)
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
  
  /**
   * Check password validity on blur
   */
  const checkPassword = (e: React.FocusEvent<HTMLInputElement>) => {
    const password = e.target.value
    const validationError = validatePassword(password)
    
    if (validationError) {
      setPasswordError(validationError)
    } else {
      setPasswordError(null)
    }
  }
  
  /**
   * Client-side validation wrapper for signup
   * Validates the form data before submitting to the server action
   */
  const signupWithValidation = async (formData: FormData) => {
    // Reset errors
    setEmailError('')
    setUsernameError('')
    setPasswordError('')
    
    // Get values for client-side validation
    const email = formData.get('email') as string
    const username = formData.get('username') as string
    const password = formData.get('password') as string
    
    // Set submitting state immediately
    setIsSubmitting(true)
    
    // Email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address')
      setIsSubmitting(false)
      return;
    }
    
    // Username validation
    if (!username) {
      setUsernameError('Username is required')
      setIsSubmitting(false)
      return;
    }
    
    if (username.length < 3) {
      setUsernameError('Username must be at least 3 characters')
      setIsSubmitting(false)
      return;
    }
    
    if (/^\d/.test(username)) {
      setUsernameError('Username cannot start with a number')
      setIsSubmitting(false)
      return;
    }
    
    if (!/^[a-z0-9]+$/.test(username)) {
      setUsernameError('Username can only contain lowercase letters and numbers')
      setIsSubmitting(false)
      return;
    }
    
    // Password validation
    if (!password) {
      setPasswordError('Password is required')
      setIsSubmitting(false)
      return;
    }
    
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      setIsSubmitting(false)
      return;
    }
    
    if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must include at least one uppercase letter')
      setIsSubmitting(false)
      return;
    }
    
    if (!/[a-z]/.test(password)) {
      setPasswordError('Password must include at least one lowercase letter')
      setIsSubmitting(false)
      return;
    }
    
    if (!/[0-9]/.test(password)) {
      setPasswordError('Password must include at least one number')
      setIsSubmitting(false)
      return;
    }
    
    if (!/[^A-Za-z0-9]/.test(password)) {
      setPasswordError('Password must include at least one special character')
      setIsSubmitting(false)
      return;
    }
    
    try {
      // Client validation has passed, submit the form to the server action
      // We don't reset isSubmitting here - it will stay true until the page
      // either redirects (on success) or encounters an error
      await signup(formData);
      // We won't reach this point on success as the action will redirect
    } catch (error) {
      console.error('Signup error:', error);
      // Only reset isSubmitting on a definite error
      setIsSubmitting(false);
      setFormError('An unexpected error occurred. Please try again.');
    }
  };

  /**
   * Client-side validation wrapper for login
   * Validates the form data before submitting to the server action
   */
  const loginWithValidation = async (formData: FormData) => {
    setEmailError('');
    setPasswordError('');
    
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    setIsSubmitting(true);
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Client validation has passed, submit the form to the server action
      // We don't reset isSubmitting here - it will stay true until the page
      // either redirects (on success) or encounters an error
      await login(formData);
      // We won't reach this point on success as the action will redirect
    } catch (error) {
      console.error('Login error:', error);
      // Only reset isSubmitting on a definite error
      setIsSubmitting(false);
      setFormError('An unexpected error occurred. Please try again.');
    }
  };
  
  // Clear all form errors when switching modes
  const resetErrors = () => {
    setFormError(null)
    setUsernameError(null)
    setPasswordError(null)
    setEmailError(null)
  }
  
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Link href="/">
            <Image src="/logo.svg" alt="ConsistencyTracker Logo" width={48} height={48} className="mx-auto" />
          </Link>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          {isSignupMode ? 'Create your account' : 'Sign in to your account'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSignupMode ? (
            <>
              Already have an account?{' '}
              <button 
                className="font-medium text-emerald-600 hover:text-emerald-500 focus:outline-none focus:underline transition ease-in-out duration-150"
                onClick={() => setIsSignupMode(false)}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              Or{' '}
              <button 
                className="font-medium text-emerald-600 hover:text-emerald-500 focus:outline-none focus:underline transition ease-in-out duration-150"
                onClick={() => setIsSignupMode(true)}
              >
                create a new account
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Registration Success Message */}
        {registrationSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Registration successful!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>We have sent a verification email to <strong>{registeredEmail}</strong>. Please check your inbox and click the verification link to activate your account.</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* General Form Error Message */}
        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Form Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{formError}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Rest of the form */}
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Login Form */}
          {!isSignupMode && (
            <form onSubmit={(e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              loginWithValidation(formData);
            }}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="login-email">
                  Email:
                </label>
                <input 
                  id="login-email" 
                  name="email" 
                  type="email" 
                  className={`shadow appearance-none border ${emailError ? 'border-red-500' : ''} rounded w-full py-2 px-3 text-gray-700`}
                  required 
                />
                {emailError && (
                  <p className="text-red-500 text-xs mt-1">{emailError}</p>
                )}
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="login-password">
                  Password:
                </label>
                <input 
                  id="login-password" 
                  name="password" 
                  type="password" 
                  className={`shadow appearance-none border ${passwordError ? 'border-red-500' : ''} rounded w-full py-2 px-3 text-gray-700`}
                  required 
                />
                {passwordError && (
                  <p className="text-red-500 text-xs mt-1">{passwordError}</p>
                )}
              </div>
              
              <div className="flex items-center justify-center">
                <button 
                  className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none w-full ${isSubmitting ? 'opacity-90 cursor-not-allowed' : ''}`}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Logging in...
                    </span>
                  ) : 'Log in'}
                </button>
              </div>
            </form>
          )}
          
          {/* Signup Form */}
          {isSignupMode && (
            <form onSubmit={(e) => {
              e.preventDefault();
              setIsSubmitting(true);
              const formData = new FormData(e.currentTarget);
              signupWithValidation(formData);
            }}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-email">
                  Email: <span className="text-red-500">*</span>
                </label>
                <input 
                  id="signup-email" 
                  name="email" 
                  type="email" 
                  className={`shadow appearance-none border ${emailError ? 'border-red-500' : ''} rounded w-full py-2 px-3 text-gray-700`}
                  required 
                />
                {emailError && (
                  <p className="text-red-500 text-xs mt-1">{emailError}</p>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="signup-username">
                  Username: <span className="text-red-500">*</span>
                </label>
                <input 
                  id="signup-username" 
                  name="username" 
                  type="text" 
                  className={`shadow appearance-none border ${usernameError ? 'border-red-500' : ''} rounded w-full py-2 px-3 text-gray-700`}
                  onBlur={checkUsername}
                  required 
                />
                {usernameError && (
                  <p className="text-red-500 text-xs mt-1">{usernameError}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">Username must start with a letter and can only contain lowercase letters and numbers.</p>
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
                  Password: <span className="text-red-500">*</span>
                </label>
                <input 
                  id="signup-password" 
                  name="password" 
                  type="password" 
                  className={`shadow appearance-none border ${passwordError ? 'border-red-500' : ''} rounded w-full py-2 px-3 text-gray-700`}
                  onBlur={checkPassword}
                  required 
                />
                {passwordError && (
                  <p className="text-red-500 text-xs mt-1">{passwordError}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
                </p>
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
                  className={`bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none w-full ${(isSubmitting || !!usernameError || !!passwordError) ? 'opacity-90 cursor-not-allowed' : ''}`}
                  type="submit"
                  disabled={isSubmitting || !!usernameError || !!passwordError}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Login page component
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
} 