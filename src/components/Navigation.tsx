'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

/**
 * Navigation component with authentication awareness
 * Shows different navigation options based on user authentication status
 */
export default function Navigation() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  /**
   * Check if user is authenticated on component mount
   */
  useEffect(() => {
    const checkAuthStatus = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      setIsLoggedIn(!!data.user)
      setIsLoading(false)
    }
    
    checkAuthStatus()
  }, [])
  
  /**
   * Toggle mobile menu open/closed
   */
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Consistency Tracker
          </Link>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4">
          <Link 
            href="/" 
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              pathname === '/' 
                ? 'bg-indigo-100 text-indigo-700' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Home
          </Link>
          
          {!isLoading && isLoggedIn && (
            <Link
              href="/dashboard"
              className={`rounded-md ${
                pathname === '/dashboard'
                  ? 'bg-indigo-700 text-white'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              } px-4 py-2 text-sm font-medium`}
            >
              Dashboard
            </Link>
          )}

          {!isLoading && (
            isLoggedIn ? (
              <form action="/auth/signout" method="post">
                <button 
                  type="submit"
                  className="rounded-md bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 text-sm font-medium"
                >
                  Sign Out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className={`rounded-md ${
                  pathname === '/login'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } px-4 py-2 text-sm font-medium`}
              >
                Sign In
              </Link>
            )
          )}
        </nav>
        
        {/* Mobile Hamburger Button */}
        <button 
          className="md:hidden p-2" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 text-indigo-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            {isMenuOpen ? (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            ) : (
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 6h16M4 12h16M4 18h16" 
              />
            )}
          </svg>
        </button>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-2 space-y-2">
            <Link 
              href="/" 
              className={`block px-3 py-2 text-sm font-medium rounded-md ${
                pathname === '/' 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            {!isLoading && isLoggedIn && (
              <Link
                href="/dashboard"
                className={`block rounded-md ${
                  pathname === '/dashboard'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                } px-4 py-2 text-sm font-medium`}
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}

            {!isLoading && (
              isLoggedIn ? (
                <form action="/auth/signout" method="post">
                  <button 
                    type="submit"
                    className="block w-full text-left rounded-md bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 text-sm font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Out
                  </button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className={`block rounded-md ${
                    pathname === '/login'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  } px-4 py-2 text-sm font-medium`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign In
                </Link>
              )
            )}
          </div>
        </div>
      )}
    </header>
  )
} 