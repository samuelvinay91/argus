import { NextResponse } from 'next/server';

// Backend URL for server-side with production fallback
const BACKEND_URL = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL
  || process.env.ARGUS_BACKEND_URL
  || (process.env.NODE_ENV === 'production'
      ? 'https://argus-brain-production.up.railway.app'
      : 'http://localhost:8000');

/**
 * Proxy endpoint to fetch OpenAPI spec from backend.
 * This avoids CORS issues when fetching from the browser.
 */
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/openapi.json`, {
      headers: {
        'Accept': 'application/json',
      },
      // Cache for 5 minutes to reduce backend load
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch OpenAPI spec' },
        { status: response.status }
      );
    }

    const spec = await response.json();

    return NextResponse.json(spec, {
      headers: {
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('Error fetching OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to fetch OpenAPI spec' },
      { status: 500 }
    );
  }
}
