/**
 * Test Clerk JWT Authentication against Skopaq Backend
 *
 * This endpoint tests that Clerk JWTs are properly verified by the Python backend.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ARGUS_BACKEND_URL || 'https://skopaq-brain-production.up.railway.app';

export async function GET() {
  try {
    // Get the Clerk session token
    const { getToken, userId } = await auth();

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Not authenticated with Clerk',
        step: 'clerk_auth',
      }, { status: 401 });
    }

    // Get the JWT token from Clerk
    const token = await getToken();

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Could not get Clerk JWT token',
        step: 'get_token',
        userId,
      }, { status: 401 });
    }

    // Test 1: Call backend health endpoint (no auth required)
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();

    // Test 2: Call backend security status endpoint (requires auth)
    const securityResponse = await fetch(`${BACKEND_URL}/api/v1/security/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const securityData = await securityResponse.json();

    // Test 3: Call a protected endpoint
    const meResponse = await fetch(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const meData = await meResponse.json();

    return NextResponse.json({
      success: securityResponse.ok,
      clerkUserId: userId,
      tokenPreview: `${token.substring(0, 20)}...${token.substring(token.length - 20)}`,
      tests: {
        health: {
          status: healthResponse.status,
          ok: healthResponse.ok,
          data: healthData,
        },
        securityStatus: {
          status: securityResponse.status,
          ok: securityResponse.ok,
          data: securityData,
        },
        authMe: {
          status: meResponse.status,
          ok: meResponse.ok,
          data: meData,
        },
      },
      backendUrl: BACKEND_URL,
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'exception',
    }, { status: 500 });
  }
}
