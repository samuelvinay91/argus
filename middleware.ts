import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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
]);

// API routes that need auth but shouldn't redirect (return 401 instead)
const isApiRoute = createRouteMatcher([
  '/api/(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  // Skip auth check for public routes
  if (isPublicRoute(request)) {
    return;
  }

  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    // For API routes, return 401 instead of redirecting
    if (isApiRoute(request)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', message: 'Please sign in to access this resource' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // For page routes, redirect to sign-in
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
