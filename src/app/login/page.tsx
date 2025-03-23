'use client'

import { useState, useEffect, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { login, signup } from './actions'

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
  
  // Check for error messages in URL
  useEffect(() => {
    const error = searchParams.get('error')
    const details = searchParams.get('details')
    
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
  
  // Create wrappers for server actions with client-side validation
  const loginWithValidation = async (formData: FormData) => {
    // Reset previous errors on form submission
    resetErrors();
    setIsSubmitting(true);
    
    // Client-side validation
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    let hasErrors = false;
    
    if (!email) {
      setEmailError('Email is required');
      hasErrors = true;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      hasErrors = true;
    }
    
    if (hasErrors) {
      setFormError('Please fill in all required fields');
      setIsSubmitting(false);
      // Don't continue to server action if validation fails
      // Return undefined instead of null to satisfy TypeScript
      return undefined;
    }
    
    try {
      // All validation passed, proceed with server action
      await login(formData);
      
      // This code will only run if login doesn't redirect
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    } catch (error) {
      // This will run if there's a JavaScript error during the submission
      console.error('Login error:', error);
      setFormError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  }

  const signupWithValidation = async (formData: FormData) => {
    // Reset previous errors on form submission
    resetErrors();
    setIsSubmitting(true);
    
    // Client-side validation
    const email = formData.get('email') as string;
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    
    let hasErrors = false;
    
    if (!email) {
      setEmailError('Email is required');
      hasErrors = true;
    }
    
    const usernameValidationError = validateUsername(username);
    if (usernameValidationError) {
      setUsernameError(usernameValidationError);
      hasErrors = true;
    }
    
    const passwordValidationError = validatePassword(password);
    if (passwordValidationError) {
      setPasswordError(passwordValidationError);
      hasErrors = true;
    }
    
    if (hasErrors) {
      setFormError('Please fix the errors before submitting');
      setIsSubmitting(false);
      // Don't continue to server action if validation fails
      return undefined;
    }
    
    // At this point validation has passed, so we set isSubmitting to true
    // and it will stay true until the server action completes (redirect)
    // or fails (caught in the catch block)
    
    try {
      // All validation passed, proceed with server action
      // The isSubmitting state will remain true during this call
      // and the page will redirect on success
      await signup(formData);
      
      // This code will only run if signup doesn't redirect
      // In that case, keep the button disabled for 2 seconds to prevent double-submission
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    } catch (error) {
      // This will run if there's a JavaScript error during the submission
      console.error('Signup error:', error);
      setFormError('An unexpected error occurred');
      setIsSubmitting(false);
    }
  }
  
  // Clear all form errors when switching modes
  const resetErrors = () => {
    setFormError(null)
    setUsernameError(null)
    setPasswordError(null)
    setEmailError(null)
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
                resetErrors()
              }}
              type="button"
            >
              Login
            </button>
            <button 
              className={`px-4 py-2 ${isSignupMode ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}
              onClick={() => {
                setIsSignupMode(true)
                resetErrors()
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            {formError}
          </div>
        )}
        
        {/* Login Form */}
        {!isSignupMode && (
          <form action={loginWithValidation}>
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
          <form action={signupWithValidation}>
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
  )
}

/**
 * Login page component
 */
export default function LoginPage() {
  return (
    <LoginForm />
  )
} 