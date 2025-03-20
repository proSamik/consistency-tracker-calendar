'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Navigation component without auth verification
 */
export default function Navigation() {
  const pathname = usePathname()
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-2">
          <Link href="/" className="text-xl font-bold text-indigo-600">
            Consistency Tracker
          </Link>
        </div>
        
        <nav className="flex items-center space-x-4">
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
        </nav>
      </div>
    </header>
  )
} 