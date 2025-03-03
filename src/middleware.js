  // src/middleware.js - For Next.js middleware to handle tenant routing
  import { NextResponse } from 'next/server';
  
  export function middleware(request) {
    const { pathname } = request.nextUrl;
    
    // Skip API routes and _next paths
    if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
      return NextResponse.next();
    }
    
    // For demo purposes, use a default tenant
    // In production, you would extract the tenant from the hostname or path
    const tenantId = 'default';
    
    // Set tenant ID in request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', tenantId);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  export const config = {
    matcher: ['/((?!_next/static|favicon.ico).*)'],
  };