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
    
    // Add shadow for 3D effect - main card
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
    ctx.shadowBlur = 15
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 8
    roundRect(ctx, 50, 80, canvas.width - 100, 200, 10, true, true)
    
    // Reset shadow for the content inside
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // Add a subtle gradient background to main card
    const gradientBg = ctx.createLinearGradient(50, 80, 50, 280)
    gradientBg.addColorStop(0, '#ffffff')
    gradientBg.addColorStop(1, '#f9fafb')
    ctx.fillStyle = gradientBg
    roundRect(ctx, 51, 81, canvas.width - 102, 198, 9, true, false)
    
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
    // Add shadow to streak circle
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 5
    
    // Circle gradient for current streak
    const circleGradient = ctx.createRadialGradient(canvas.width/2, 130, 0, canvas.width/2, 130, 60)
    circleGradient.addColorStop(0, getPlatformColor())
    circleGradient.addColorStop(1, adjustColor(getPlatformColor(), -20)) // Darker at the edges
    
    // Circle for current streak
    ctx.beginPath()
    ctx.arc(canvas.width/2, 130, 60, 0, Math.PI * 2)
    ctx.fillStyle = circleGradient
    ctx.fill()
    
    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
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
    
    // Add calendar placeholder text with 3D shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
    ctx.shadowBlur = 10
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 6
    
    ctx.fillStyle = '#f9fafb'
    roundRect(ctx, 50, 300, canvas.width - 100, 80, 10, true, false)
    
    // Reset shadow
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    
    // Add a subtle gradient to calendar placeholder
    const calendarGradient = ctx.createLinearGradient(50, 300, 50, 380)
    calendarGradient.addColorStop(0, '#f9fafb')
    calendarGradient.addColorStop(1, '#f3f4f6')
    ctx.fillStyle = calendarGradient
    roundRect(ctx, 51, 301, canvas.width - 102, 78, 9, true, false)
    
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
      case 'twitter': return '#000000' // Updated Twitter/X color to black
      case 'instagram': return '#E4405F' // Keep Instagram pink color, or use gradient later
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
        // X logo (formerly Twitter) - official SVG path
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        // Using the exact path from the official X logo SVG
        ctx.moveTo(18.244, 2.25)
        ctx.lineTo(21.552, 2.25)
        ctx.lineTo(14.325, 10.51)
        ctx.lineTo(22.827, 21.75)
        ctx.lineTo(16.17, 21.75)
        ctx.lineTo(10.956, 14.933)
        ctx.lineTo(4.99, 21.75)
        ctx.lineTo(1.68, 21.75)
        ctx.lineTo(9.41, 12.915)
        ctx.lineTo(1.254, 2.25)
        ctx.lineTo(8.08, 2.25)
        ctx.lineTo(12.793, 8.481)
        ctx.lineTo(18.244, 2.25)
        ctx.moveTo(17.083, 19.77)
        ctx.lineTo(18.916, 19.77)
        ctx.lineTo(7.084, 4.126)
        ctx.lineTo(5.117, 4.126)
        ctx.lineTo(17.083, 19.77)
        ctx.fill()
        break
        
      case 'instagram':
        // Instagram logo - official SVG path
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        
        // Main shape
        ctx.moveTo(12, 2.982)
        ctx.bezierCurveTo(14.937, 2.982, 15.285, 2.993, 16.445, 3.046)
        ctx.bezierCurveTo(17.522, 3.094, 18.269, 3.275, 18.487, 3.425)
        ctx.bezierCurveTo(18.954, 3.599, 19.31, 3.892, 19.752, 4.248)
        ctx.bezierCurveTo(20.21, 4.619, 20.581, 5.068, 20.831, 5.513)
        ctx.bezierCurveTo(21.061, 5.934, 21.188, 6.395, 21.21, 7.088)
        ctx.bezierCurveTo(21.263, 8.248, 21.274, 8.596, 21.274, 12.000)
        ctx.bezierCurveTo(21.274, 15.404, 21.263, 15.752, 21.21, 16.912)
        ctx.bezierCurveTo(21.188, 17.605, 21.061, 18.066, 20.831, 18.487)
        ctx.bezierCurveTo(20.315, 19.635, 19.387, 20.521, 18.487, 20.575)
        ctx.bezierCurveTo(18.269, 20.725, 17.522, 20.907, 16.445, 20.954)
        ctx.bezierCurveTo(15.285, 21.007, 14.937, 21.018, 12, 21.018)
        ctx.bezierCurveTo(9.063, 21.018, 8.715, 21.007, 7.555, 20.954)
        ctx.bezierCurveTo(6.478, 20.906, 5.731, 20.725, 5.513, 20.575)
        ctx.bezierCurveTo(4.613, 20.521, 3.685, 19.635, 3.169, 18.487)
        ctx.bezierCurveTo(2.939, 18.066, 2.812, 17.605, 2.79, 16.912)
        ctx.bezierCurveTo(2.737, 15.752, 2.726, 15.404, 2.726, 12)
        ctx.bezierCurveTo(2.726, 8.596, 2.737, 8.248, 2.79, 7.088)
        ctx.bezierCurveTo(2.812, 6.395, 2.939, 5.934, 3.169, 5.513)
        ctx.bezierCurveTo(3.419, 5.068, 3.79, 4.619, 4.248, 4.248)
        ctx.bezierCurveTo(4.69, 3.892, 5.046, 3.599, 5.513, 3.425)
        ctx.bezierCurveTo(5.731, 3.275, 6.478, 3.094, 7.555, 3.046)
        ctx.bezierCurveTo(8.715, 2.993, 9.063, 2.982, 12, 2.982)
        
        ctx.moveTo(12, 1)
        ctx.bezierCurveTo(9.013, 1, 8.638, 1.013, 7.465, 1.066)
        ctx.bezierCurveTo(6.057, 1.134, 5.071, 1.333, 4.189, 1.63)
        ctx.bezierCurveTo(3.261, 1.936, 2.437, 2.421, 1.949, 2.9)
        ctx.bezierCurveTo(1.371, 3.502, 0.927, 4.223, 0.68, 5.004)
        ctx.bezierCurveTo(0.398, 5.944, 0.247, 7.035, 0.077, 8.171)
        ctx.bezierCurveTo(1.012, 8.638, 1, 9.013, 1, 12)
        ctx.bezierCurveTo(1, 14.987, 1.013, 15.362, 1.066, 16.535)
        ctx.bezierCurveTo(1.134, 17.943, 1.333, 18.929, 1.63, 19.811)
        ctx.bezierCurveTo(1.927, 20.721, 2.4, 21.548, 2.9, 22.051)
        ctx.bezierCurveTo(3.417, 22.573, 4.068, 23.001, 4.848, 23.269)
        ctx.bezierCurveTo(5.794, 23.536, 6.878, 23.725, 8.171, 23.923)
        ctx.bezierCurveTo(8.638, 22.988, 9.013, 23, 12, 23)
        ctx.bezierCurveTo(14.987, 23, 15.362, 22.987, 16.535, 22.934)
        ctx.bezierCurveTo(17.943, 22.866, 18.929, 22.667, 19.811, 22.37)
        ctx.bezierCurveTo(20.721, 22.073, 21.858, 21.332, 22.37, 20.189)
        ctx.bezierCurveTo(22.652, 19.249, 22.803, 18.158, 22.934, 17.535)
        ctx.bezierCurveTo(22.988, 15.362, 23, 14.987, 23, 12)
        ctx.bezierCurveTo(23, 9.013, 22.987, 8.638, 22.934, 7.465)
        ctx.bezierCurveTo(22.866, 6.057, 22.667, 5.071, 22.37, 4.189)
        ctx.bezierCurveTo(22.073, 3.279, 21.6, 2.452, 21.1, 1.949)
        ctx.bezierCurveTo(20.583, 1.427, 19.932, 0.999, 19.152, 0.731)
        ctx.bezierCurveTo(18.206, 0.464, 17.122, 0.275, 15.829, 0.077)
        ctx.bezierCurveTo(15.362, 1.012, 14.987, 1, 12, 1)
        
        // Add the camera circle
        ctx.moveTo(12, 6.351)
        ctx.bezierCurveTo(9.055, 6.351, 6.649, 8.757, 6.351, 12)
        ctx.bezierCurveTo(6.351, 14.945, 8.757, 17.649, 12, 17.649)
        ctx.bezierCurveTo(14.945, 17.649, 17.649, 14.945, 17.649, 12)
        ctx.bezierCurveTo(17.649, 9.055, 14.945, 6.351, 12, 6.351)
        
        ctx.moveTo(12, 15.667)
        ctx.bezierCurveTo(9.423, 15.667, 7.333, 13.577, 7.333, 12)
        ctx.bezierCurveTo(7.333, 9.423, 9.423, 7.333, 12, 7.333)
        ctx.bezierCurveTo(13.577, 7.333, 15.667, 9.423, 15.667, 12)
        ctx.bezierCurveTo(15.667, 13.577, 13.577, 15.667, 12, 15.667)
        
        // Add the dot in the top right
        ctx.moveTo(17.872, 4.808)
        ctx.bezierCurveTo(17.46, 4.808, 17.128, 5.14, 17.128, 5.552)
        ctx.bezierCurveTo(17.128, 5.964, 17.46, 6.296, 17.872, 6.296)
        ctx.bezierCurveTo(18.284, 6.296, 18.616, 5.964, 18.616, 5.552)
        ctx.bezierCurveTo(18.616, 5.14, 18.284, 4.808, 17.872, 4.808)
        
        // Apply a more accurate gradient fill
        const gradient = ctx.createLinearGradient(1, 1, 23, 23);
        gradient.addColorStop(0, '#FFDC80');
        gradient.addColorStop(0.1, '#FCAF45');
        gradient.addColorStop(0.2, '#F77737');
        gradient.addColorStop(0.5, '#F56040');
        gradient.addColorStop(0.75, '#FD1D1D');
        gradient.addColorStop(0.9, '#C13584');
        gradient.addColorStop(1, '#833AB4');
        
        ctx.fillStyle = gradient;
        ctx.fill();
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
        
        // For X (formerly Twitter), we'll open a compose window with prefilled text
        const text = `Check out my consistency streak! ${username}'s Calendar`
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
        
        // Open X in a new tab
        window.open(url, '_blank')
        
        // Also download the image since X doesn't accept direct file uploads through the intent API
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
  
  // Helper function to adjust colors for gradients
  const adjustColor = (hex: string, amount: number): string => {
    // Remove # if present
    hex = hex.replace('#', '')
    
    // Parse the color components
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount))
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount))
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount))
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
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
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 mr-3 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
              </svg>
              X
            </button>
            
            <button
              onClick={shareToInstagram}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 rounded-md transition-colors"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 24 24" width="24" height="24">
                <path d="M12 2.982c2.937 0 3.285.011 4.445.064a6.087 6.087 0 0 1 2.042.379 3.408 3.408 0 0 1 1.265.823 3.408 3.408 0 0 1 .823 1.265 6.087 6.087 0 0 1 .379 2.042c.053 1.16.064 1.508.064 4.445s-.011 3.285-.064 4.445a6.087 6.087 0 0 1-.379 2.042 3.643 3.643 0 0 1-2.088 2.088 6.087 6.087 0 0 1-2.042.379c-1.16.053-1.508.064-4.445.064s-3.285-.011-4.445-.064a6.087 6.087 0 0 1-2.043-.379 3.408 3.408 0 0 1-1.264-.823 3.408 3.408 0 0 1-.823-1.265 6.087 6.087 0 0 1-.379-2.042c-.053-1.16-.064-1.508-.064-4.445s.011-3.285.064-4.445a6.087 6.087 0 0 1 .379-2.042 3.408 3.408 0 0 1 .823-1.265 3.408 3.408 0 0 1 1.265-.823 6.087 6.087 0 0 1 2.042-.379c1.16-.053 1.508-.064 4.445-.064M12 1c-2.987 0-3.362.013-4.535.066a8.074 8.074 0 0 0-2.67.511 5.392 5.392 0 0 0-1.949 1.27 5.392 5.392 0 0 0-1.269 1.948 8.074 8.074 0 0 0-.51 2.67C1.012 8.638 1 9.013 1 12s.013 3.362.066 4.535a8.074 8.074 0 0 0 .511 2.67 5.392 5.392 0 0 0 1.27 1.949 5.392 5.392 0 0 0 1.948 1.269 8.074 8.074 0 0 0 2.67.51C8.638 22.988 9.013 23 12 23s3.362-.013 4.535-.066a8.074 8.074 0 0 0 2.67-.511 5.625 5.625 0 0 0 3.218-3.218 8.074 8.074 0 0 0 .51-2.67C22.988 15.362 23 14.987 23 12s-.013-3.362-.066-4.535a8.074 8.074 0 0 0-.511-2.67 5.392 5.392 0 0 0-1.27-1.949 5.392 5.392 0 0 0-1.948-1.269 8.074 8.074 0 0 0-2.67-.51C15.362 1.012 14.987 1 12 1Zm0 5.351A5.649 5.649 0 1 0 17.649 12 5.649 5.649 0 0 0 12 6.351Zm0 9.316A3.667 3.667 0 1 1 15.667 12 3.667 3.667 0 0 1 12 15.667Zm5.872-10.859a1.32 1.32 0 1 0 1.32 1.32 1.32 1.32 0 0 0-1.32-1.32Z"></path>
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