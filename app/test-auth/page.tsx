'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';

export default function TestAuthPage() {
  const { getToken, userId, isSignedIn } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<string | null>(null);

  const testAuth = async () => {
    setLoading(true);
    setResult(null);

    try {
      // Get the Clerk JWT token
      const token = await getToken();
      setTokenInfo(token ? `${token.substring(0, 30)}...` : 'No token');

      // Call our test API route
      const response = await fetch('/api/test-auth');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testBackendDirect = async () => {
    setLoading(true);
    setResult(null);

    try {
      const token = await getToken();
      setTokenInfo(token ? `${token.substring(0, 30)}...` : 'No token');

      const backendUrl = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL || 'https://argus-brain-production.up.railway.app';

      // Test health (no auth)
      const healthRes = await fetch(`${backendUrl}/health`);
      const healthData = await healthRes.json();

      // Test security info (with auth)
      const securityRes = await fetch(`${backendUrl}/api/v1/security/info`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const securityData = await securityRes.json();

      // Test /auth/me endpoint
      const meRes = await fetch(`${backendUrl}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const meData = await meRes.json();

      // Test /auth/debug-token endpoint to see raw JWT claims
      const debugRes = await fetch(`${backendUrl}/api/v1/auth/debug-token`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const debugData = await debugRes.json();

      setResult({
        backendUrl,
        clerkUserId: userId,
        tests: {
          health: { status: healthRes.status, ok: healthRes.ok, data: healthData },
          securityStatus: { status: securityRes.status, ok: securityRes.ok, data: securityData },
          authMe: { status: meRes.status, ok: meRes.ok, data: meData },
          debugToken: { status: debugRes.status, ok: debugRes.ok, data: debugData },
        },
      });
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Clerk Auth Test</h1>
        <p className="text-red-400">Please sign in to test authentication.</p>
        <a href="/sign-in" className="mt-4 inline-block px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
          Sign In
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Clerk JWT Authentication Test</h1>

      <div className="mb-6 p-4 bg-gray-800 rounded">
        <p className="text-green-400">Signed in as: {userId}</p>
        {tokenInfo && <p className="text-gray-400 text-sm mt-2">Token: {tokenInfo}</p>}
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={testAuth}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test via API Route'}
        </button>

        <button
          onClick={testBackendDirect}
          disabled={loading}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Backend Direct'}
        </button>
      </div>

      {result && (
        <div className="p-4 bg-gray-800 rounded">
          <h2 className="text-lg font-semibold mb-2">Results:</h2>
          <pre className="text-sm overflow-auto max-h-96 bg-gray-950 p-4 rounded">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-800 rounded">
        <h2 className="text-lg font-semibold mb-2">Expected Results:</h2>
        <ul className="list-disc list-inside text-gray-300 space-y-1">
          <li><strong>Health:</strong> Should return 200 OK (no auth required)</li>
          <li><strong>Security Status:</strong> Should return 200 with security info (if auth works)</li>
          <li><strong>Auth Me:</strong> Should return user info from Clerk JWT (if auth works)</li>
        </ul>
      </div>
    </div>
  );
}
