'use client'

import { useState, useRef, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { ProfileData } from '@/types/profile'

/**
 * Component that adds a button to capture and share calendar screenshots
 * Includes user handles at the bottom of the captured image
 */
export default function ShareButton({
  username,
  platform,
  calendarRef
}: {
  username: string
  platform: 'github' | 'twitter' | 'instagram' | 'youtube' | 'all'
  calendarRef: React.RefObject<HTMLDivElement>
}) {
  const [isCapturing, setIsCapturing] = useState(false)
  const [userData, setUserData] = useState<ProfileData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watermarkRef = useRef<HTMLDivElement>(null)
  const [useFallbackMethod, setUseFallbackMethod] = useState(false)
  
  // Fetch user profile data
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const response = await fetch(`/api/profile?username=${username}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch user profile')
        }
        
        const data = await response.json()
        setUserData(data.profile)
      } catch (err) {
        console.error('Error fetching user profile:', err)
        setError('Failed to load user profile')
      }
    }
    
    fetchUserProfile()
  }, [username])
  
  // Simple fallback capture method
  const fallbackCaptureMethod = async () => {
    if (!calendarRef.current || !userData) return null
    
    try {
      // Create simplified capture that avoids problematic color functions
      const captureDiv = document.createElement('div')
      captureDiv.style.backgroundColor = 'white'
      captureDiv.style.color = 'black'
      captureDiv.style.fontFamily = 'Arial, sans-serif'
      captureDiv.style.width = '800px'
      captureDiv.style.padding = '20px'
      captureDiv.style.borderRadius = '8px'
      captureDiv.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
      
      // Add title
      const title = document.createElement('h2')
      title.textContent = `${username}'s ${platform.charAt(0).toUpperCase() + platform.slice(1)} Calendar`
      title.style.fontSize = '24px'
      title.style.textAlign = 'center'
      title.style.margin = '10px 0 20px'
      captureDiv.appendChild(title)
      
      // Add streak info (simplified)
      const streakEl = document.createElement('div')
      streakEl.style.display = 'flex'
      streakEl.style.justifyContent = 'space-around'
      streakEl.style.padding = '10px'
      streakEl.style.marginBottom = '20px'
      streakEl.style.borderRadius = '8px'
      streakEl.style.backgroundColor = '#f9fafb'
      
      // Extract streak information from the existing calendar
      const streakWidget = calendarRef.current.querySelector('.mb-6')
      if (streakWidget) {
        const numbers = Array.from(streakWidget.querySelectorAll('.text-3xl.font-bold'))
          .map(el => el.textContent)
        
        if (numbers.length >= 2) {
          const total = document.createElement('div')
          total.style.textAlign = 'center'
          total.innerHTML = `<div style="font-size:24px;font-weight:bold">${numbers[0]}</div><div style="font-size:14px">Total</div>`
          
          const current = document.createElement('div')
          current.style.textAlign = 'center'
          current.innerHTML = `<div style="font-size:36px;font-weight:bold;color:white;background:purple;border-radius:999px;width:80px;height:80px;display:flex;align-items:center;justify-content:center;margin:0 auto">${calendarRef.current.querySelector('[class*="rounded-full"]')?.textContent || '0'}</div><div style="font-size:14px;margin-top:5px">Current Streak</div>`
          
          const longest = document.createElement('div')
          longest.style.textAlign = 'center'
          longest.innerHTML = `<div style="font-size:24px;font-weight:bold">${numbers[1]}</div><div style="font-size:14px">Longest</div>`
          
          streakEl.appendChild(total)
          streakEl.appendChild(current)
          streakEl.appendChild(longest)
        }
      }
      captureDiv.appendChild(streakEl)
      
      // Add watermark
      const watermark = document.createElement('div')
      watermark.style.borderTop = '1px solid #eee'
      watermark.style.paddingTop = '10px'
      watermark.style.marginTop = '20px'
      watermark.style.fontSize = '14px'
      watermark.style.textAlign = 'center'
      watermark.style.color = '#6b7280'
      
      // Add handles based on platform
      let handleText = ''
      if (platform === 'all') {
        const handles = []
        if (userData.github_username) handles.push(`GitHub: @${userData.github_username}`)
        if (userData.twitter_username) handles.push(`Twitter: @${userData.twitter_username}`)
        if (userData.instagram_username) handles.push(`Instagram: @${userData.instagram_username}`)
        if (userData.youtube_username) handles.push(`YouTube: @${userData.youtube_username}`)
        handleText = handles.join(' • ')
      } else {
        const platformUsername = userData[`${platform}_username`]
        if (platformUsername) {
          handleText = `${platform.charAt(0).toUpperCase() + platform.slice(1)}: @${platformUsername}`
        }
      }
      
      watermark.textContent = handleText || `Created by ${userData.username}`
      captureDiv.appendChild(watermark)
      
      // Temporarily add to DOM for capture
      document.body.appendChild(captureDiv)
      const canvas = await html2canvas(captureDiv, {
        backgroundColor: 'white',
        scale: 2,
        logging: false
      })
      document.body.removeChild(captureDiv)
      
      return canvas
    } catch (err) {
      console.error('Fallback capture also failed:', err)
      return null
    }
  }

  // Handle share button click
  const handleShare = async () => {
    if (!calendarRef.current || !userData) return
    
    setIsCapturing(true)
    
    try {
      let canvas
      
      if (!useFallbackMethod) {
        try {
          // Create a temporary clone of the calendar and add watermark
          const tempDiv = document.createElement('div')
          tempDiv.style.position = 'absolute'
          tempDiv.style.left = '-9999px'
          tempDiv.style.top = '-9999px'
          tempDiv.style.backgroundColor = 'white' // Ensure white background
          
          // Clone the calendar without privacy controls
          const clone = calendarRef.current.cloneNode(true) as HTMLElement
          
          // Remove privacy controls if they exist in the clone
          const privacyControls = clone.querySelector('.privacy-controls')
          if (privacyControls) {
            privacyControls.remove()
          }
          
          // Process elements with potentially unsupported color functions
          const allElements = clone.querySelectorAll('*')
          allElements.forEach(el => {
            if (el instanceof HTMLElement) {
              // Replace any potential oklch colors with solid alternatives
              if (window.getComputedStyle(el).backgroundColor?.includes('oklch')) {
                el.style.backgroundColor = '#f3f4f6' // Light gray fallback
              }
              if (window.getComputedStyle(el).color?.includes('oklch')) {
                el.style.color = '#1f2937' // Dark gray fallback for text
              }
            }
          })
          
          tempDiv.appendChild(clone)
          
          // Create watermark with user handles
          const watermark = document.createElement('div')
          watermark.style.background = 'white'
          watermark.style.padding = '12px'
          watermark.style.borderTop = '1px solid #eee'
          watermark.style.display = 'flex'
          watermark.style.justifyContent = 'center'
          watermark.style.alignItems = 'center'
          watermark.style.fontSize = '14px'
          
          // Add the appropriate handles based on the platform
          let handleText = ''
          
          if (platform === 'all') {
            // Show all available handles
            const handles = []
            if (userData.github_username) handles.push(`GitHub: @${userData.github_username}`)
            if (userData.twitter_username) handles.push(`Twitter: @${userData.twitter_username}`)
            if (userData.instagram_username) handles.push(`Instagram: @${userData.instagram_username}`)
            if (userData.youtube_username) handles.push(`YouTube: @${userData.youtube_username}`)
            
            handleText = handles.join(' • ')
          } else {
            // Show platform-specific handle
            const platformUsername = userData[`${platform}_username`]
            if (platformUsername) {
              handleText = `${platform.charAt(0).toUpperCase() + platform.slice(1)}: @${platformUsername}`
            }
          }
          
          watermark.textContent = handleText || `Created by ${userData.username}`
          tempDiv.appendChild(watermark)
          
          // Add to DOM temporarily, capture screenshot, then remove
          document.body.appendChild(tempDiv)
          
          canvas = await html2canvas(tempDiv, {
            allowTaint: true,
            useCORS: true,
            backgroundColor: 'white', // Explicitly set white background
            scale: 2, // Higher resolution
            logging: false, // Reduce console noise
            ignoreElements: (element) => {
              // Skip elements that might cause problems
              return element.classList.contains('privacy-controls');
            },
          })
          
          document.body.removeChild(tempDiv)
        } catch (primaryError) {
          console.error('Primary capture method failed:', primaryError)
          
          // If the error is related to color functions, try the fallback
          if (primaryError instanceof Error && 
              (primaryError.message.includes('oklch') || 
               primaryError.message.includes('color'))) {
            setUseFallbackMethod(true)
            canvas = await fallbackCaptureMethod()
          } else {
            throw primaryError
          }
        }
      } else {
        // Use fallback method directly if previously failed
        canvas = await fallbackCaptureMethod()
      }
      
      // If both methods failed
      if (!canvas) {
        throw new Error('All capture methods failed')
      }
      
      // Convert to shareable image
      const image = canvas.toDataURL('image/png')
      
      // Create a blob from the data URL
      const blob = await (await fetch(image)).blob()
      
      // Use Web Share API if available
      if (navigator.share) {
        const file = new File([blob], 'calendar.png', { type: 'image/png' })
        await navigator.share({
          title: 'My Consistency Calendar',
          text: 'Check out my consistency streak!',
          files: [file]
        })
      } else {
        // Fallback: Create download link
        const link = document.createElement('a')
        link.href = image
        link.download = 'consistency-calendar.png'
        link.click()
      }
    } catch (err) {
      console.error('Error capturing calendar:', err)
      
      // Provide more specific error message based on the error type
      let errorMessage = 'Failed to capture calendar. Please try again.'
      
      if (err instanceof Error) {
        if (err.message.includes('oklch') || err.message.includes('color')) {
          errorMessage = 'Failed to capture calendar due to unsupported color formats. Please try in a different browser.'
        } else if (err.message.includes('timeout') || err.message.includes('network')) {
          errorMessage = 'Network timeout while capturing. Check your connection and try again.'
        } else if (err.message === 'All capture methods failed') {
          errorMessage = 'Could not capture calendar. Please try in a different browser such as Chrome.'
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsCapturing(false)
    }
  }
  
  return (
    <button
      onClick={handleShare}
      disabled={isCapturing || !userData}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white font-medium transition-colors ${
        isCapturing 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-indigo-600 hover:bg-indigo-700'
      }`}
      aria-label="Share calendar"
    >
      {isCapturing ? (
        <>
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Capturing...</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          <span>Share</span>
        </>
      )}
    </button>
  )
} 