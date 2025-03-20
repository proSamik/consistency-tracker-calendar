import { NextResponse, type NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

/**
 * Edge middleware function that runs before page renders
 * to check authentication status and redirect if needed
 */
export async function middleware(request: NextRequest) {
  try {
    // Skip middleware for React Server Component requests
    if (request.nextUrl.searchParams.has('_rsc')) {
      return NextResponse.next();
    }
    
    // Create a response object
    const res = NextResponse.next();
    
    // Create a Supabase client specifically for middleware environment
    const supabase = createMiddlewareClient({ req: request, res });
    
    // This refreshes the session and must be awaited
    await supabase.auth.getSession();

    // Get the URL
    const url = request.nextUrl.clone();
    const path = url.pathname;
    
    // Get the session only after refreshing
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // Check if requesting protected routes and not authenticated
    if (path.startsWith('/dashboard') && !session) {
      // Create a redirect URL with the current path saved
      const redirectUrl = new URL('/auth', request.url);
      redirectUrl.searchParams.set('redirectedFrom', path);
      return NextResponse.redirect(redirectUrl);
    }

    // If already authenticated and trying to access auth page, redirect to dashboard
    if (path.startsWith('/auth') && session) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    // For all other cases, return the response with updated cookies
    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    // In case of error, proceed but don't redirect
    return NextResponse.next();
  }
}

/**
 * Specify which routes this middleware should run on
 */
export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}; 