// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { UserRole } from './lib/types/auth'

// Paths that don't require authentication
const publicPaths = ['/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // Get auth token from request cookies
  const cookieStore = request.cookies
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    // Redirect to login if no token
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify token and get user info
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/auth/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Pass the original user agent from the request
        'User-Agent': request.headers.get('user-agent') || 'unknown',
      },
      body: JSON.stringify({
        deviceInfo: {
          platform: request.headers.get('sec-ch-ua-platform') || 'unknown',
          screenResolution: 'unknown',
          language: request.headers.get('accept-language') || 'unknown',
          timezone: 'unknown'
        }
      })
    })

    if (!res.ok) {
      // Token is invalid, redirect to login
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('auth_token')
      return response
    }

    const data = await res.json()

    // Check role-based access
    if (pathname.startsWith('/admin') && data.role !== UserRole.ADMIN) {
      // Non-admin trying to access admin routes
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    if (pathname.startsWith('/dashboard') && data.role === UserRole.ADMIN) {
      // Admin trying to access user routes
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // All checks passed
    return NextResponse.next()
  } catch {
    // Error verifying token, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth_token')
    return response
  }
}

export const config = {
  // Paths to run the middleware on
  matcher: [
    /*
     * Match all paths except:
     * 1. /api (API routes)
     * 2. /_next (Next.js internals)
     * 3. /_static (inside /public)
     * 4. /_vercel (Vercel internals)
     * 5. /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!api|_next|_static|_vercel|favicon.ico|sitemap.xml).*)',
  ],
}