'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, SignInButton, SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Crown,
  Shield,
  UserPlus,
  ArrowRight,
  AlertCircle,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useValidateInvitation,
  useAcceptInvitation,
  type InvitationDetails,
} from '@/lib/hooks/use-invitations';

type PageState =
  | 'loading'
  | 'invalid'
  | 'expired'
  | 'valid-not-logged-in'
  | 'valid-logged-in'
  | 'accepting'
  | 'success'
  | 'error';

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  member: { label: 'Member', icon: Users, color: 'text-green-500', bgColor: 'bg-green-500/10' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export default function InvitationAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Validate invitation using the hook (public endpoint)
  const { data: validationResult, isLoading: validating, refetch: revalidate } = useValidateInvitation(token);

  // Accept invitation using the authenticated hook
  const acceptInvitation = useAcceptInvitation();

  // Process validation result
  useEffect(() => {
    if (validating) {
      setPageState('loading');
      return;
    }

    if (!validationResult) return;

    if (validationResult.valid) {
      setInvitation(validationResult.invitation);
      if (isLoaded) {
        setPageState(isSignedIn ? 'valid-logged-in' : 'valid-not-logged-in');
      }
    } else {
      // Handle different error types
      if (validationResult.error === 'invalid' || validationResult.error === 'accepted') {
        setPageState('invalid');
      } else if (validationResult.error === 'expired') {
        setPageState('expired');
      } else {
        setPageState('error');
      }
      setErrorMessage(validationResult.message);
    }
  }, [validationResult, validating, isLoaded, isSignedIn]);

  // Update state when auth changes
  useEffect(() => {
    if (isLoaded && invitation && pageState !== 'accepting' && pageState !== 'success' && pageState !== 'error') {
      setPageState(isSignedIn ? 'valid-logged-in' : 'valid-not-logged-in');
    }
  }, [isLoaded, isSignedIn, invitation, pageState]);

  const handleAccept = async () => {
    if (!isSignedIn) return;

    setPageState('accepting');
    setErrorMessage('');

    try {
      await acceptInvitation.mutateAsync(token);
      setPageState('success');

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
      setPageState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to accept invitation. Please try again.');
    }
  };

  const handleDecline = () => {
    // Simply redirect away - the invitation remains pending
    router.push('/');
  };

  // Background gradient component
  const BackgroundDecoration = () => (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]" />
      <div className="absolute top-1/2 right-10 w-[200px] h-[200px] bg-amber-500/5 rounded-full blur-[80px]" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );

  // Logo component
  const Logo = () => (
    <Link href="/" className="flex items-center gap-3 mb-8">
      <div className="relative">
        <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
          <Eye className="w-6 h-6 text-white" />
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-background" />
      </div>
      <span className="text-2xl font-bold tracking-tight">Argus</span>
    </Link>
  );

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BackgroundDecoration />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Logo />
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-muted-foreground">Validating invitation...</span>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (pageState === 'invalid') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <BackgroundDecoration />
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center">
            <Logo />
          </div>
          <Card className="border-red-500/30">
            <CardContent className="pt-8 pb-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
                <p className="text-muted-foreground mb-6">{errorMessage}</p>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    If you believe this is an error, please contact the person who sent you this invitation.
                  </p>
                  <div className="flex flex-col gap-2">
                    <SignUpButton mode="modal">
                      <Button className="w-full">
                        Create an Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </SignUpButton>
                    <Link href="/">
                      <Button variant="outline" className="w-full">
                        Go to Homepage
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Expired token state
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <BackgroundDecoration />
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center">
            <Logo />
          </div>
          <Card className="border-amber-500/30">
            <CardContent className="pt-8 pb-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
                <p className="text-muted-foreground mb-6">{errorMessage}</p>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Please ask the organization administrator to send you a new invitation.
                  </p>
                  <div className="flex flex-col gap-2">
                    <SignUpButton mode="modal">
                      <Button className="w-full">
                        Create an Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </SignUpButton>
                    <Link href="/">
                      <Button variant="outline" className="w-full">
                        Go to Homepage
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <BackgroundDecoration />
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center">
            <Logo />
          </div>
          <Card className="border-emerald-500/30">
            <CardContent className="pt-8 pb-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 animate-celebrate">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Welcome to {invitation?.organization_name}!</h2>
                <p className="text-muted-foreground mb-4">
                  You have successfully joined the organization.
                </p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting to dashboard...
                </div>
                <Button onClick={() => router.push('/dashboard')} className="w-full">
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <BackgroundDecoration />
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center">
            <Logo />
          </div>
          <Card className="border-red-500/30">
            <CardContent className="pt-8 pb-6">
              <div className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Something Went Wrong</h2>
                <p className="text-muted-foreground mb-6">{errorMessage}</p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => revalidate()} className="w-full">
                    Try Again
                  </Button>
                  <Link href="/">
                    <Button variant="outline" className="w-full">
                      Go to Homepage
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Valid invitation - show details
  if (!invitation) return null;

  const RoleIcon = ROLE_CONFIG[invitation.role].icon;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <BackgroundDecoration />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center">
          <Logo />
        </div>

        <Card className="border-primary/30">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserPlus className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl">You&apos;re Invited!</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join an organization on Argus
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Organization Details */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Organization</p>
                <p className="font-semibold text-lg">{invitation.organization_name}</p>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Invited by</p>
                  <p className="text-sm">{invitation.inviter_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded", ROLE_CONFIG[invitation.role].bgColor)}>
                  <RoleIcon className={cn("h-4 w-4", ROLE_CONFIG[invitation.role].color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your role will be</p>
                  <p className="text-sm font-medium">{ROLE_CONFIG[invitation.role].label}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Expires {new Date(invitation.expires_at).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Actions based on auth state */}
            {pageState === 'valid-not-logged-in' && (
              <div className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                  Sign in or create an account to accept this invitation
                </p>
                <div className="flex flex-col gap-2">
                  <SignInButton
                    mode="modal"
                    forceRedirectUrl={`/invitations/${token}`}
                  >
                    <Button className="w-full" size="lg">
                      Sign In to Accept
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </SignInButton>
                  <SignUpButton
                    mode="modal"
                    forceRedirectUrl={`/invitations/${token}`}
                  >
                    <Button variant="outline" className="w-full" size="lg">
                      Create an Account
                    </Button>
                  </SignUpButton>
                </div>
              </div>
            )}

            {pageState === 'valid-logged-in' && (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleAccept}
                  className="w-full"
                  size="lg"
                >
                  Accept Invitation
                  <CheckCircle className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDecline}
                  className="w-full"
                  size="lg"
                >
                  Decline
                </Button>
              </div>
            )}

            {pageState === 'accepting' && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-muted-foreground">Accepting invitation...</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By accepting this invitation, you agree to Argus&apos;s{' '}
          <Link href="/legal/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
