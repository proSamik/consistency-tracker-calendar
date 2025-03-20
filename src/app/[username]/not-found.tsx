import Link from 'next/link'

/**
 * Custom not found page for the [username] route
 * Displays when a user profile cannot be found
 */
export default function UserProfileNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col justify-center items-center p-8">
      <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-indigo-600 mb-4">Profile Not Found</h1>
        <p className="text-gray-600 mb-6">
          The user profile you&apos;re looking for doesn&apos;t exist or may have been removed.
        </p>
        <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded inline-block">
          Return Home
        </Link>
      </div>
    </div>
  )
}