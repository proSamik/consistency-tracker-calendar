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
  const [showShareOptions, setShowShareOptions] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const shareMenuRef = useRef<HTMLDivElement>(null)
  
  // Close share menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareOptions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
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
  
  // Reset state when closing share menu
  useEffect(() => {
    if (!showShareOptions) {
      setCapturedImage(null)
    }
  }, [showShareOptions])
  
  // Get platform-specific color
  const getPlatformColor = () => {
    switch(platform) {
      case 'github': return '#22c55e' // green-500
      case 'twitter': return '#3b82f6' // blue-500
      case 'instagram': return '#ec4899' // pink-500
      case 'youtube': return '#ef4444' // red-500
      default: return '#8b5cf6' // purple-500
    }
  }
  
  // Extract streak data from the calendar
  const extractStreakData = () => {
    let currentStreak = '0'
    let totalCount = '0'
    let longestStreak = '0'
    let dateRanges = {
      currentStart: '',
      currentEnd: '',
      longestStart: '',
      longestEnd: ''
    }
    
    if (calendarRef.current) {
      // Find the streak widget and extract the numbers
      const streakWidget = calendarRef.current.querySelector('.mb-6')
      if (streakWidget) {
        const numbers = Array.from(streakWidget.querySelectorAll('.text-3xl.font-bold'))
          .map(el => el.textContent || '0')
        
        if (numbers.length >= 2) {
          totalCount = numbers[0] || '0'
          longestStreak = numbers[1] || '0'
        }
        
        // Extract current streak from circle
        const currentStreakEl = streakWidget.querySelector('[class*="rounded-full"]')
        if (currentStreakEl) {
          currentStreak = currentStreakEl.textContent || '0'
        }
        
        // Try to extract date ranges
        const dateTexts = Array.from(streakWidget.querySelectorAll('.text-xs.text-gray-500'))
          .map(el => el.textContent || '')
        
        if (dateTexts.length >= 3) {
          // Total date range is typically first
          if (dateTexts[0].includes('-')) {
            dateRanges.currentStart = dateTexts[0].split('-')[0].trim()
            dateRanges.currentEnd = dateTexts[0].split('-')[1].trim()
          }
          
          // Current streak dates
          if (dateTexts[1] && dateTexts[1] !== 'N/A') {
            const parts = dateTexts[1].split('-')
            if (parts.length === 2) {
              dateRanges.currentStart = parts[0].trim()
              dateRanges.currentEnd = parts[1].trim()
            }
          }
          
          // Longest streak dates
          if (dateTexts[2] && dateTexts[2] !== 'N/A') {
            const parts = dateTexts[2].split('-')
            if (parts.length === 2) {
              dateRanges.longestStart = parts[0].trim()
              dateRanges.longestEnd = parts[1].trim()
            }
          }
        }
      }
    }
    
    return {
      current: currentStreak,
      total: totalCount,
      longest: longestStreak,
      dateRanges
    }
  }
  
  // Get handles text for watermark
  const getHandlesText = () => {
    if (!userData) return `Created by ${username}`
    
    if (platform === 'all') {
      // Show all available handles
      const handles = []
      if (userData.github_username) handles.push(`GitHub: @${userData.github_username}`)
      if (userData.twitter_username) handles.push(`Twitter: @${userData.twitter_username}`)
      if (userData.instagram_username) handles.push(`Instagram: @${userData.instagram_username}`)
      if (userData.youtube_username) handles.push(`YouTube: @${userData.youtube_username}`)
      
      return handles.join(' • ')
    } else {
      // Show platform-specific handle
      const platformUsername = userData[`${platform}_username` as keyof ProfileData]
      if (platformUsername) {
        return `${platform.charAt(0).toUpperCase() + platform.slice(1)}: @${platformUsername}`
      }
    }
    
    return `Created by ${username}`
  }
  
  // Direct canvas drawing approach
  const createCanvasImage = () => {
    const streakData = extractStreakData()
    
    // Create canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Could not get canvas context')
    }
    
    // Set dimensions
    canvas.width = 800
    canvas.height = 500
    
    // Fill background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Get user's full name or use username if not available
    const fullName = userData?.full_name || username
    
    // Draw title - main calendar name
    ctx.font = 'bold 28px sans-serif'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.fillText(`${fullName}`, canvas.width/2, 40)
    
    // Add site URL/username as subtitle
    const siteUrl = window.location.origin.replace(/^https?:\/\//, '');
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#6b7280'
    ctx.fillText(`${siteUrl}/${username}`, canvas.width/2, 65)
    
    // Draw the streak widget container
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    roundRect(ctx, 50, 80, canvas.width - 100, 200, 10, true, true)
    
    // Draw Total section
    ctx.font = 'bold 36px sans-serif'
    ctx.fillStyle = '#000000'
    ctx.textAlign = 'center'
    ctx.fillText(streakData.total, 200, 140)
    
    ctx.font = '16px sans-serif'
    ctx.fillText('Total', 200, 170)
    
    // Add date range for total if available
    if (streakData.dateRanges.currentStart && streakData.dateRanges.currentEnd) {
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#6b7280'
      ctx.fillText(`${streakData.dateRanges.currentStart} - ${streakData.dateRanges.currentEnd}`, 200, 190)
    }
    
    // Draw Current Streak section (middle)
    // Circle for current streak
    ctx.beginPath()
    ctx.arc(canvas.width/2, 130, 60, 0, Math.PI * 2)
    ctx.fillStyle = getPlatformColor()
    ctx.fill()
    
    // Current streak number
    ctx.font = 'bold 44px sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(streakData.current, canvas.width/2, 145)
    
    // Current streak label
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#000000'
    ctx.fillText('Current Streak', canvas.width/2, 220)
    
    // Add date range for current streak if available
    if (streakData.dateRanges.currentStart && streakData.dateRanges.currentEnd) {
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#6b7280'
      ctx.fillText(`${streakData.dateRanges.currentStart} - ${streakData.dateRanges.currentEnd}`, canvas.width/2, 240)
    }
    
    // Draw Longest Streak section
    ctx.font = 'bold 36px sans-serif'
    ctx.fillStyle = '#000000'
    ctx.fillText(streakData.longest, 600, 140)
    
    ctx.font = '16px sans-serif'
    ctx.fillText('Longest Streak', 600, 170)
    
    // Add date range for longest streak if available
    if (streakData.dateRanges.longestStart && streakData.dateRanges.longestEnd) {
      ctx.font = '12px sans-serif'
      ctx.fillStyle = '#6b7280'
      ctx.fillText(`${streakData.dateRanges.longestStart} - ${streakData.dateRanges.longestEnd}`, 600, 190)
    }
    
    // Add calendar placeholder text
    ctx.fillStyle = '#f9fafb'
    roundRect(ctx, 50, 300, canvas.width - 100, 80, 10, true, false)
    
    ctx.font = '16px sans-serif'
    ctx.fillStyle = '#6b7280'
    ctx.fillText('Calendar visualization available on the site', canvas.width/2, 345)
    
    // Add divider
    ctx.strokeStyle = '#e5e7eb'
    ctx.beginPath()
    ctx.moveTo(50, 420)
    ctx.lineTo(canvas.width - 50, 420)
    ctx.stroke()
    
    // Draw platform logos instead of text
    if (userData) {
      const logoSize = 24;
      const logoSpacing = 10;
      const textSpacing = 5;
      const logosY = 450;
      
      // Determine which platforms to show based on the selected platform
      const handles: string[] = [];
      
      if (platform === 'all') {
        // Show all available platforms
        if (userData.github_username) handles.push('github');
        if (userData.twitter_username) handles.push('twitter');
        if (userData.instagram_username) handles.push('instagram');
        if (userData.youtube_username) handles.push('youtube');
      } else {
        // Show only the selected platform if the user has that handle
        const platformUsername = userData[`${platform}_username` as keyof ProfileData];
        if (platformUsername) {
          handles.push(platform);
        }
      }
      
      if (handles.length > 0) {
        // Calculate the width needed for each platform (logo + username + spacing)
        const platformWidths: number[] = [];
        let totalWidth = 0;
        
        ctx.font = '14px sans-serif';
        
        for (const platform of handles) {
          const platformUsername = userData[`${platform}_username` as keyof ProfileData];
          if (platformUsername) {
            const textWidth = ctx.measureText(`@${platformUsername}`).width;
            const width = logoSize + textSpacing + textWidth;
            platformWidths.push(width);
            totalWidth += width;
          } else {
            platformWidths.push(logoSize);
            totalWidth += logoSize;
          }
        }
        
        // Add spacing between items
        if (handles.length > 1) {
          totalWidth += (handles.length - 1) * logoSpacing;
        }
        
        // Center all logos
        let xPos = (canvas.width - totalWidth) / 2;
        
        // Draw each platform and username
        for (let i = 0; i < handles.length; i++) {
          const platform = handles[i];
          const platformUsername = userData[`${platform}_username` as keyof ProfileData];
          
          // Draw platform logo
          ctx.fillStyle = getPlatformColorByName(platform);
          drawPlatformLogo(ctx, platform, xPos, logosY - logoSize/2, logoSize);
          
          // Add username text if available
          if (platformUsername) {
            ctx.font = '14px sans-serif';
            ctx.fillStyle = '#6b7280';
            ctx.textAlign = 'left';
            ctx.fillText(`@${platformUsername}`, xPos + logoSize + textSpacing, logosY + 5);
          }
          
          // Move to next position
          xPos += platformWidths[i] + logoSpacing;
        }
      } else {
        // Fallback if no handles to display
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#6b7280';
        ctx.textAlign = 'center';
        ctx.fillText(`Created by ${username}`, canvas.width/2, logosY);
      }
    } else {
      // Fallback if no user data
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#6b7280';
      ctx.textAlign = 'center';
      ctx.fillText(`Created by ${username}`, canvas.width/2, 450);
    }
    
    return canvas.toDataURL('image/png');
  }
  
  // Helper function to get platform color by name
  const getPlatformColorByName = (platformName: string) => {
    switch(platformName) {
      case 'github': return '#22c55e' // green-500
      case 'twitter': return '#3b82f6' // blue-500
      case 'instagram': return '#ec4899' // pink-500
      case 'youtube': return '#ef4444' // red-500
      default: return '#8b5cf6' // purple-500
    }
  }
  
  // Helper function to draw platform logos
  const drawPlatformLogo = (
    ctx: CanvasRenderingContext2D,
    platform: string,
    x: number,
    y: number,
    size: number
  ) => {
    ctx.save()
    ctx.translate(x, y)
    const scale = size / 24 // Assuming original SVG size is 24x24
    ctx.scale(scale, scale)
    
    switch(platform) {
      case 'github':
        // GitHub logo path
        ctx.fillStyle = '#24292e'
        ctx.beginPath()
        ctx.moveTo(12, 0)
        ctx.bezierCurveTo(5.37, 0, 0, 5.37, 0, 12)
        ctx.bezierCurveTo(0, 17.31, 3.435, 21.795, 8.205, 23.385)
        ctx.bezierCurveTo(8.805, 23.49, 9.03, 23.13, 9.03, 22.815)
        ctx.bezierCurveTo(9.03, 22.53, 9.015, 21.585, 9.015, 20.58)
        ctx.bezierCurveTo(6, 21.135, 5.22, 19.845, 4.98, 19.17)
        ctx.bezierCurveTo(4.845, 18.825, 4.26, 17.76, 3.75, 17.475)
        ctx.bezierCurveTo(3.33, 17.25, 2.73, 16.695, 3.735, 16.68)
        ctx.bezierCurveTo(4.68, 16.665, 5.355, 17.55, 5.58, 17.91)
        ctx.bezierCurveTo(6.66, 19.725, 8.385, 19.215, 9.075, 18.9)
        ctx.bezierCurveTo(9.18, 18.12, 9.495, 17.595, 9.84, 17.295)
        ctx.bezierCurveTo(7.17, 16.995, 4.38, 15.96, 4.38, 11.37)
        ctx.bezierCurveTo(4.38, 10.065, 4.845, 8.985, 5.61, 8.145)
        ctx.bezierCurveTo(5.49, 7.845, 5.07, 6.615, 5.73, 4.965)
        ctx.bezierCurveTo(5.73, 4.965, 6.735, 4.65, 9.03, 6.195)
        ctx.bezierCurveTo(9.99, 5.925, 11.01, 5.79, 12.03, 5.79)
        ctx.bezierCurveTo(13.05, 5.79, 14.07, 5.925, 15.03, 6.195)
        ctx.bezierCurveTo(17.325, 4.635, 18.33, 4.965, 18.33, 4.965)
        ctx.bezierCurveTo(18.99, 6.615, 18.57, 7.845, 18.45, 8.145)
        ctx.bezierCurveTo(19.215, 8.985, 19.68, 10.05, 19.68, 11.37)
        ctx.bezierCurveTo(19.68, 15.975, 16.875, 16.995, 14.205, 17.295)
        ctx.bezierCurveTo(14.64, 17.67, 15.015, 18.39, 15.015, 19.515)
        ctx.bezierCurveTo(15.015, 21.12, 15, 22.41, 15, 22.815)
        ctx.bezierCurveTo(15, 23.13, 15.225, 23.505, 15.825, 23.385)
        ctx.bezierCurveTo(20.565, 21.795, 24, 17.295, 24, 12)
        ctx.bezierCurveTo(24, 5.37, 18.63, 0, 12, 0)
        ctx.fill()
        break
        
      case 'twitter':
        // Twitter/X logo path
        ctx.fillStyle = '#1DA1F2'
        ctx.beginPath()
        ctx.moveTo(24, 4.557)
        ctx.bezierCurveTo(23.117, 4.948, 22.168, 5.212, 21.172, 5.332)
        ctx.bezierCurveTo(22.188, 4.71, 22.969, 3.759, 23.337, 2.608)
        ctx.bezierCurveTo(22.386, 3.171, 21.332, 3.582, 20.21, 3.803)
        ctx.bezierCurveTo(19.312, 2.846, 18.032, 2.25, 16.616, 2.25)
        ctx.bezierCurveTo(13.437, 2.25, 11.101, 5.214, 11.819, 8.292)
        ctx.bezierCurveTo(7.728, 8.087, 4.1, 6.128, 1.671, 3.149)
        ctx.bezierCurveTo(0.381, 5.362, 1.002, 8.257, 3.194, 9.723)
        ctx.bezierCurveTo(2.388, 9.697, 1.628, 9.476, 0.964, 9.107)
        ctx.bezierCurveTo(0.911, 11.388, 2.546, 13.522, 4.914, 13.997)
        ctx.bezierCurveTo(4.221, 14.185, 3.462, 14.229, 2.69, 14.081)
        ctx.bezierCurveTo(3.316, 16.037, 5.134, 17.46, 7.29, 17.5)
        ctx.bezierCurveTo(5.22, 19.123, 2.612, 19.848, 0, 19.539)
        ctx.bezierCurveTo(2.179, 20.937, 4.768, 21.75, 7.548, 21.75)
        ctx.bezierCurveTo(16.69, 21.75, 21.855, 14.084, 21.543, 7.106)
        ctx.bezierCurveTo(22.505, 6.411, 23.34, 5.544, 24, 4.557)
        ctx.fill()
        break
        
      case 'instagram':
        // Instagram logo path
        ctx.fillStyle = '#E4405F'
        ctx.beginPath()
        ctx.moveTo(12, 2.163)
        ctx.bezierCurveTo(15.204, 2.163, 15.584, 2.175, 16.85, 2.233)
        ctx.bezierCurveTo(20.102, 2.381, 21.621, 3.924, 21.769, 7.152)
        ctx.bezierCurveTo(21.827, 8.417, 21.838, 8.797, 21.838, 12.001)
        ctx.bezierCurveTo(21.838, 15.206, 21.826, 15.585, 21.769, 16.85)
        ctx.bezierCurveTo(21.62, 20.075, 20.105, 21.621, 16.85, 21.769)
        ctx.bezierCurveTo(15.584, 21.827, 15.206, 21.839, 12, 21.839)
        ctx.bezierCurveTo(8.796, 21.839, 8.416, 21.827, 7.151, 21.769)
        ctx.bezierCurveTo(3.891, 21.62, 2.38, 20.07, 2.232, 16.849)
        ctx.bezierCurveTo(2.174, 15.584, 2.162, 15.205, 2.162, 12)
        ctx.bezierCurveTo(2.162, 8.796, 2.175, 8.417, 2.232, 7.151)
        ctx.bezierCurveTo(2.381, 3.924, 3.896, 2.38, 7.151, 2.232)
        ctx.bezierCurveTo(8.417, 2.175, 8.796, 2.163, 12, 2.163)
        ctx.fill()
        
        // Center white square
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(12, 6.865)
        ctx.bezierCurveTo(8.597, 6.865, 5.838, 9.624, 5.838, 13.027)
        ctx.bezierCurveTo(5.838, 16.43, 8.597, 19.189, 12, 19.189)
        ctx.bezierCurveTo(15.403, 19.189, 18.162, 16.43, 18.162, 13.027)
        ctx.bezierCurveTo(18.162, 9.624, 15.403, 6.865, 12, 6.865)
        ctx.fill()
        
        // Center circle
        ctx.fillStyle = '#E4405F'
        ctx.beginPath()
        ctx.arc(12, 13.027, 2.595, 0, 2 * Math.PI)
        ctx.fill()
        
        // Top-right dot
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(16.27, 7.73, 1.0, 0, 2 * Math.PI)
        ctx.fill()
        break
        
      case 'youtube':
        // YouTube logo path
        ctx.fillStyle = '#FF0000'
        ctx.beginPath()
        ctx.moveTo(23.498, 6.186)
        ctx.bezierCurveTo(23.222, 5.093, 22.315, 4.186, 21.222, 3.909)
        ctx.bezierCurveTo(19.348, 3.369, 12, 3.369, 12, 3.369)
        ctx.bezierCurveTo(12, 3.369, 4.652, 3.369, 2.778, 3.909)
        ctx.bezierCurveTo(1.685, 4.186, 0.778, 5.093, 0.502, 6.186)
        ctx.bezierCurveTo(-0.038, 8.059, -0.038, 12, -0.038, 12)
        ctx.bezierCurveTo(-0.038, 12, -0.038, 15.941, 0.502, 17.814)
        ctx.bezierCurveTo(0.778, 18.907, 1.685, 19.814, 2.778, 20.091)
        ctx.bezierCurveTo(4.652, 20.631, 12, 20.631, 12, 20.631)
        ctx.bezierCurveTo(12, 20.631, 19.348, 20.631, 21.222, 20.091)
        ctx.bezierCurveTo(22.315, 19.814, 23.222, 18.907, 23.498, 17.814)
        ctx.bezierCurveTo(24.038, 15.941, 24.038, 12, 24.038, 12)
        ctx.bezierCurveTo(24.038, 12, 24.038, 8.059, 23.498, 6.186)
        ctx.fill()
        
        // Play triangle
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.moveTo(9.6, 15.6)
        ctx.lineTo(9.6, 8.4)
        ctx.lineTo(16.8, 12)
        ctx.closePath()
        ctx.fill()
        break
        
      default:
        // Generic fallback circle
        ctx.beginPath()
        ctx.arc(12, 12, 12, 0, 2 * Math.PI)
        ctx.fill()
    }
    
    ctx.restore()
  }
  
  // Helper function to draw rounded rectangles
  const roundRect = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    radius: number, 
    fill: boolean, 
    stroke: boolean
  ) => {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    if (fill) {
      ctx.fill()
    }
    if (stroke) {
      ctx.stroke()
    }
  }

  // Handle capture button click
  const handleCapture = async () => {
    if (!calendarRef.current || !userData) return
    
    setIsCapturing(true)
    
    try {
      // Use the direct canvas method
      const image = createCanvasImage()
      setCapturedImage(image)
      setShowShareOptions(true)
    } catch (err) {
      console.error('Error creating calendar image:', err)
      alert('Failed to create calendar image. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  // Share to Twitter
  const shareToTwitter = () => {
    if (!capturedImage) return
    
    // Create a blob from the data URL
    fetch(capturedImage)
      .then(res => res.blob())
      .then(blob => {
        // Create a File object
        const file = new File([blob], 'calendar.png', { type: 'image/png' })
        
        // For Twitter, we'll open a compose window with prefilled text
        const text = `Check out my consistency streak! ${username}'s Calendar`
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
        
        // Open Twitter in a new tab
        window.open(url, '_blank')
        
        // Also download the image since Twitter doesn't accept direct file uploads through the intent API
        const downloadLink = document.createElement('a')
        downloadLink.href = capturedImage
        downloadLink.download = 'consistency-calendar.png'
        downloadLink.click()
        
        // Close the share menu
        setShowShareOptions(false)
      })
  }
  
  // Share to Instagram
  const shareToInstagram = () => {
    if (!capturedImage) return
    
    // Since Instagram doesn't have a web intent API, we can only download the image
    // and guide users to upload it manually
    const downloadLink = document.createElement('a')
    downloadLink.href = capturedImage
    downloadLink.download = 'consistency-calendar.png'
    downloadLink.click()
    
    alert('Image downloaded! Open Instagram and upload this image from your photos.')
    setShowShareOptions(false)
  }
  
  // Download image
  const downloadImage = () => {
    if (!capturedImage) return
    
    const downloadLink = document.createElement('a')
    downloadLink.href = capturedImage
    downloadLink.download = 'consistency-calendar.png'
    downloadLink.click()
    
    setShowShareOptions(false)
  }
  
  // Use native share if available
  const useNativeShare = async () => {
    if (!capturedImage) return
    
    try {
      // Create a blob from the data URL
      const blob = await (await fetch(capturedImage)).blob()
      
      // Use Web Share API
      const file = new File([blob], 'calendar.png', { type: 'image/png' })
      await navigator.share({
        title: 'My Consistency Calendar',
        text: 'Check out my consistency streak!',
        files: [file]
      })
    } catch (err) {
      console.error('Error using native share:', err)
      // Fallback to download if share fails
      downloadImage()
    }
    
    setShowShareOptions(false)
  }
  
  return (
    <div className="relative">
      <button
        onClick={handleCapture}
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
      
      {/* Share options dropdown */}
      {showShareOptions && capturedImage && (
        <div 
          ref={shareMenuRef}
          className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-50 overflow-hidden border border-gray-200"
        >
          <div className="p-3 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-700">Share to</h3>
          </div>
          
          <div className="p-2">
            {/* Platform-specific sharing options */}
            <button
              onClick={shareToTwitter}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723 10.1 10.1 0 01-3.127 1.184 4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
              </svg>
              Twitter
            </button>
            
            <button
              onClick={shareToInstagram}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Instagram
            </button>
            
            <div className="border-t border-gray-100 my-2"></div>
            
            {/* Download option */}
            <button
              onClick={downloadImage}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Image
            </button>
            
            {/* Native share option (if available) */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={useNativeShare}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                <svg className="w-5 h-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                More Options
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 