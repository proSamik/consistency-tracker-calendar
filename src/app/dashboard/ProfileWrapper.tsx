'use client'

import ProfileSection from './ProfileSection'

/**
 * Client wrapper component for ProfileSection
 * Ensures proper hydration of client-side components
 */
export default function ProfileWrapper({ 
  userId, 
  userData 
}: { 
  userId: string; 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userData: Record<string, any> | null;
}) {
  return (
    <ProfileSection 
      userId={userId}
      userData={userData}
    />
  )
} 