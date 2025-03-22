import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

/**
 * Edge middleware function for authentication checking and token refreshing
 * Excludes the landing page (/) from authentication requirements
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

/**
 * Specify which routes this middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - Root path (/) - Landing page
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Any static assets with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|$).*)',
  ],
} 