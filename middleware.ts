/**
 * Next.js Middleware
 * Handles authentication and route protection
 */

import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
  // Public routes that don't require authentication
  publicRoutes: [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/health',
    '/api/webhook(.*)',
    '/api/twilio(.*)',
    '/api/stripe/webhook',
  ],
  // Routes that should be ignored by Clerk
  ignoredRoutes: [
    '/api/health',
    '/api/webhook(.*)',
    '/api/twilio(.*)',
    '/api/stripe/webhook',
  ],
})

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
