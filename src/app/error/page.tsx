'use client'

/**
 * Simple error page displayed when auth operations fail
 */
export default function ErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="max-w-md p-8 bg-white shadow-lg rounded-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
        <p className="text-gray-700 mb-4">Sorry, something went wrong with your authentication request.</p>
        <p className="text-gray-600 mb-6">Please try again or contact support if the problem persists.</p>
        <a 
          href="/login" 
          className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Return to Login
        </a>
      </div>
    </div>
  )
} 