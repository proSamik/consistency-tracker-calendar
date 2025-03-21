import { NextRequest, NextResponse } from 'next/server'
import { createDbClient, executeWithRetry } from '@/lib/db'
import { users, activities } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getLoggedInUser } from '@/lib/auth'
import { formatISO, parseISO, format } from 'date-fns'

/**
 * Format a date to YYYY-MM-DD
 * @param date Date to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

/**
 * GitHub GraphQL API query to fetch user contributions
 */
const GITHUB_CONTRIBUTIONS_QUERY = `
  query($username: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $username) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              weekday
              color
            }
          }
        }
        commitContributionsByRepository(maxRepositories: 100) {
          repository {
            name
            nameWithOwner
            url
          }
          contributions(first: 1) {
            totalCount
          }
        }
      }
    }
  }
`

/**
 * API route to fetch GitHub contributions and sync to the database
 * @param request The incoming request
 * @returns JSON response with synced data
 */
export async function POST(request: NextRequest) {
  try {
    // Get request data
    const requestData = await request.json().catch(() => ({}))
    const { date, token: userProvidedToken, userId } = requestData
    
    // Parse date or use current date if not provided
    const targetDate = date ? parseISO(date) : new Date()
    const formattedDate = formatDate(targetDate)
    
    let user;
    
    // If userId is provided, this is a request from the cron job
    // Otherwise, get the currently logged in user
    if (userId) {
      // Check if this is a cron job request with the proper authorization
      const authHeader = request.headers.get('Authorization')
      if (process.env.CRON_SECRET && (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.CRON_SECRET)) {
        return NextResponse.json(
          { error: 'Unauthorized. Cron secret required for userId parameter.' }, 
          { status: 401 }
        )
      }
      
      // Use the provided userId
      user = { id: userId }
    } else {
      // Get the currently logged in user
      user = await getLoggedInUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required. Please log in.' }, 
          { status: 401 }
        )
      }
    }
    
    // Get GitHub username from user profile
    const db = createDbClient()
    const userData = await executeWithRetry(async () => {
      const userResults = await db.select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)
      
      if (userResults.length > 0) {
        return userResults[0]
      }
      return null
    })
    
    if (!userData) {
      return NextResponse.json(
        { error: 'User profile not found. Please complete your profile first.' },
        { status: 400 }
      )
    }

    if (!userData.github_username) {
      return NextResponse.json(
        { error: 'GitHub username not found in your profile. Please add your GitHub username first.' },
        { status: 400 }
      )
    }

    // Use token from request if provided, otherwise use environment variable
    const githubToken = userProvidedToken || process.env.GITHUB_TOKEN
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token not configured. Please provide a token in the request or configure it in the environment.' },
        { status: 500 }
      )
    }

    // Calculate date range (just the target date for now)
    const fromDate = new Date(targetDate)
    fromDate.setHours(0, 0, 0, 0)
    
    const toDate = new Date(targetDate)
    toDate.setHours(23, 59, 59, 999)
    
    console.log(`Syncing GitHub activities for user: ${userData.github_username}, date: ${formattedDate}`);
    
    // Query GitHub API
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'ConsistencyTracker-App',
      },
      body: JSON.stringify({
        query: GITHUB_CONTRIBUTIONS_QUERY,
        variables: {
          username: userData.github_username,
          from: formatISO(fromDate),
          to: formatISO(toDate)
        }
      })
    });

    // Handle GitHub API errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub API error (${response.status}): ${errorText}`);
      
      let errorMessage = `GitHub API error: ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage = 'GitHub API authentication failed. The token may be invalid or expired.';
      } else if (response.status === 403) {
        errorMessage = 'GitHub API rate limit exceeded or insufficient permissions.';
      } else if (response.status === 404) {
        errorMessage = `GitHub user "${userData.github_username}" not found.`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const githubData = await response.json()
    
    // Check for GraphQL API errors
    if (githubData.errors) {
      console.error('GitHub GraphQL API errors:', githubData.errors);
      const errorMessage = githubData.errors.map((e: any) => e.message).join(', ');
      return NextResponse.json(
        { error: `GitHub GraphQL API error: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    // Check if user data exists in the response
    if (!githubData.data?.user) {
      return NextResponse.json(
        { error: `GitHub user "${userData.github_username}" not found or is not accessible with the current token.` },
        { status: 404 }
      );
    }
    
    // Extract contribution data for the specific date
    const contributionData = extractContributionData(githubData, formattedDate)
    
    // Update or insert activity data in the database
    await executeWithRetry(async () => {
      // Check if activity record exists for this date
      const existingActivity = await db.select()
        .from(activities)
        .where(
          and(
            eq(activities.username, userData.username || ''),
            eq(activities.activity_date, formattedDate)
          )
        )
        .limit(1)
      
      const contributionCount = contributionData.contributionCount
      const repositories = contributionData.repositories
      
      if (existingActivity.length > 0) {
        // Update existing record
        await db.update(activities)
          .set({
            github_data: {
              contributions: contributionCount,
              repositories: repositories
            },
            last_synced: new Date(),
            // Recalculate total_activity_count by adding the contribution count
            // and subtracting any previous GitHub contributions
            total_activity_count: (existingActivity[0].total_activity_count || 0) - 
              ((existingActivity[0].github_data as any)?.contributions || 0) + 
              contributionCount
          })
          .where(
            and(
              eq(activities.username, userData.username || ''),
              eq(activities.activity_date, formattedDate)
            )
          )
      } else {
        // Insert new record
        await db.insert(activities)
          .values({
            username: userData.username || '',
            activity_date: formattedDate,
            github_data: {
              contributions: contributionCount,
              repositories: repositories
            },
            last_synced: new Date(),
            total_activity_count: contributionCount
          })
      }
    })

    return NextResponse.json({
      message: 'GitHub contributions synced successfully',
      date: formattedDate,
      data: contributionData
    })
  } catch (error: any) {
    console.error('Error syncing GitHub contributions:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync GitHub contributions',
        details: error.message || String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Extract contribution data for a specific date from GitHub response
 * @param data GitHub API response data
 * @param targetDate Target date in YYYY-MM-DD format
 * @returns Extracted contribution data
 */
function extractContributionData(data: any, targetDate: string) {
  try {
    if (!data.data?.user?.contributionsCollection?.contributionCalendar?.weeks) {
      return { contributionCount: 0, repositories: [] }
    }

    // Find contribution for the target date
    let contributionCount = 0
    const weeks = data.data.user.contributionsCollection.contributionCalendar.weeks
    
    for (const week of weeks) {
      for (const day of week.contributionDays) {
        if (day.date === targetDate) {
          contributionCount = day.contributionCount
          break
        }
      }
    }

    // Get repository data
    const repositoryData = data.data.user.contributionsCollection.commitContributionsByRepository || []
    const repositories = repositoryData.map((repo: any) => ({
      name: repo.repository.name,
      nameWithOwner: repo.repository.nameWithOwner,
      url: repo.repository.url,
      contributions: repo.contributions.totalCount
    }))

    return {
      contributionCount,
      repositories
    }
  } catch (error) {
    console.error('Error extracting contribution data:', error)
    return { contributionCount: 0, repositories: [] }
  }
} 