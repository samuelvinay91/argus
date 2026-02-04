import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/legal(.*)',
  '/api/webhook(.*)',
  '/api/chat(.*)',  // Chat API - auth handled by backend
  '/api/v1/:path*', // Backend API - auth handled by Railway backend (accepts Clerk JWT or API key)
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  // Static assets
  '/(.*)\\.png',
  '/(.*)\\.jpg',
  '/(.*)\\.jpeg',
  '/(.*)\\.gif',
  '/(.*)\\.svg',
  '/(.*)\\.webp',
  '/(.*)\\.ico',
]);

// API routes that need auth but shouldn't redirect (return 401 instead)
const isApiRoute = createRouteMatcher([
  '/api/(.*)',
]);

// Check if request is an RSC prefetch (these should not redirect, causes CORS issues)
const isRscRequest = (request: Request) => {
  const url = new URL(request.url);
  return (
    url.searchParams.has('_rsc') ||
    request.headers.get('RSC') === '1' ||
    request.headers.get('Next-Router-Prefetch') === '1'
  );
};

export default clerkMiddleware(async (auth, request) => {
  const url = new URL(request.url);

  // Skip auth check for public routes (except home page which needs auth check for redirect)
  if (isPublicRoute(request) && url.pathname !== '/') {
    return;
  }

  const { userId, redirectToSignIn } = await auth();

  // Handle authenticated users on home page - redirect to dashboard
  if (userId && url.pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Handle unauthenticated users
  if (!userId) {
    // Home page for unauthenticated users - show landing page
    if (url.pathname === '/') {
      return;
    }

    // For API routes, return 401 instead of redirecting
    if (isApiRoute(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to access this resource' },
        { status: 401 }
      );
    }

    // For RSC prefetch requests, rewrite to sign-in page
    // This avoids CORS issues when Clerk tries to redirect prefetch requests
    if (isRscRequest(request)) {
      return NextResponse.rewrite(new URL('/sign-in', request.url));
    }

    // For regular page routes, redirect to sign-in
    return redirectToSignIn({ returnBackUrl: request.url });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and /api/v1/* (proxied to Railway backend)
    "/((?!_next|api/v1|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Run for API routes EXCEPT /api/v1/* (which bypasses to Railway)
    "/(api(?!/v1)|trpc)(.*)",
  ],
};
