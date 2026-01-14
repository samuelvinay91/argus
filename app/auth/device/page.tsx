'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, Loader2, Terminal, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

type AuthStatus = 'idle' | 'loading' | 'success' | 'error' | 'expired' | 'invalid';

function DeviceAuthContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const { getToken } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();
  
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Auto-format code input
  const formatCode = (input: string): string => {
    const cleaned = input.toUpperCase().replace(/[^A-Z]/g, '');
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
    }
    return cleaned;
  };

  const [userCode, setUserCode] = useState(code ? formatCode(code) : '');

  useEffect(() => {
    if (code) {
      setUserCode(formatCode(code));
    }
  }, [code]);

  const handleApprove = async () => {
    if (!userCode || userCode.length < 9) {
      setErrorMessage('Please enter a valid code');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const token = await getToken();
      const backendUrl = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL || 'https://argus-brain-production.up.railway.app';
      
      const response = await fetch(`${backendUrl}/api/v1/auth/device/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`,
        },
        body: new URLSearchParams({
          user_code: userCode,
          approve: 'true',
        }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        const data = await response.json();
        if (data.detail?.includes('expired') || data.detail?.includes('Expired')) {
          setStatus('expired');
          setErrorMessage('This code has expired. Please request a new code from your CLI tool.');
        } else if (data.detail?.includes('not found') || data.detail?.includes('Invalid')) {
          setStatus('invalid');
          setErrorMessage('Invalid code. Please check the code and try again.');
        } else {
          setStatus('error');
          setErrorMessage(data.detail || 'Failed to authorize device');
        }
      }
    } catch (error) {
      console.error('Device auth error:', error);
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  const handleDeny = async () => {
    setStatus('loading');
    
    try {
      const token = await getToken();
      const backendUrl = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL || 'https://argus-brain-production.up.railway.app';
      
      await fetch(`${backendUrl}/api/v1/auth/device/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`,
        },
        body: new URLSearchParams({
          user_code: userCode,
          approve: 'false',
        }),
      });
      
      // Redirect to home after denying
      window.location.href = '/';
    } catch (error) {
      console.error('Device deny error:', error);
      window.location.href = '/';
    }
  };

  // Loading state while Clerk loads
  if (!userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Back to home link */}
      <div className="w-full max-w-md mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to dashboard
        </Link>
      </div>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Terminal className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Device Authorization</CardTitle>
          <CardDescription>
            A CLI tool or MCP server is requesting access to your Argus account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {status === 'success' ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-500">Device Authorized!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You can now close this window and return to your CLI tool.
                </p>
              </div>
            </div>
          ) : status === 'expired' || status === 'invalid' ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-destructive">
                  {status === 'expired' ? 'Code Expired' : 'Invalid Code'}
                </h3>
                <p className="text-sm text-muted-foreground mt-2">{errorMessage}</p>
              </div>
              <Button variant="outline" onClick={() => setStatus('idle')} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* User info */}
              {user && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Shield className="h-5 w-5 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.fullName || user.primaryEmailAddress?.emailAddress}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Authorizing as this account
                    </p>
                  </div>
                </div>
              )}

              {/* Code input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={userCode}
                  onChange={(e) => setUserCode(formatCode(e.target.value))}
                  placeholder="XXXX-XXXX"
                  maxLength={9}
                  className="w-full px-4 py-4 text-2xl text-center font-mono tracking-widest rounded-lg border bg-muted/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                  disabled={status === 'loading'}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Enter the code shown in your CLI tool
                </p>
              </div>

              {/* Permissions notice */}
              <div className="rounded-lg border border-border/50 p-4 space-y-2">
                <p className="text-sm font-medium">This will allow the device to:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Access your projects and tests
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Run E2E tests on your behalf
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    View quality intelligence data
                  </li>
                </ul>
              </div>

              {/* Error message */}
              {status === 'error' && errorMessage && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}
            </>
          )}
        </CardContent>

        {status !== 'success' && status !== 'expired' && status !== 'invalid' && (
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDeny}
              disabled={status === 'loading'}
            >
              Deny
            </Button>
            <Button
              className="flex-1"
              onClick={handleApprove}
              disabled={status === 'loading' || !userCode || userCode.length < 9}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Authorizing...
                </>
              ) : (
                'Authorize Device'
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Only authorize devices you trust.{' '}
          <Link href="/legal/security" className="text-primary hover:underline">
            Learn more about security
          </Link>
        </p>
      </div>
    </div>
  );
}

// Loading fallback for Suspense
function DeviceAuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function DeviceAuthPage() {
  return (
    <Suspense fallback={<DeviceAuthLoading />}>
      <DeviceAuthContent />
    </Suspense>
  );
}
