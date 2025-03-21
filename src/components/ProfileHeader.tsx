'use client'

import Link from 'next/link'
import { ProfileData } from '@/types/profile'

/**
 * Component that displays the user profile header with name and joining date
 */
export default function ProfileHeader({
  userData,
  username
}: {
  userData: ProfileData
  username: string
}) {
  // Format joining date
  const joiningDate = userData.created_at 
    ? new Date(userData.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Unknown'
    
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1 className="text-3xl font-bold text-indigo-600">
          {userData.full_name || username}
        </h1>
        <p className="text-gray-600 mt-2">
          Member since: {joiningDate}
        </p>
      </div>
      <Link href="/" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
        Home
      </Link>
    </div>
  )
} 