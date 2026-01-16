'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRevokeMCPSession } from '@/lib/hooks/use-mcp-sessions';
import { useCurrentOrg } from '@/lib/contexts/organization-context';
import { useAuth } from '@clerk/nextjs';
import { authenticatedFetch } from '@/lib/api-client';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';
import { SignInButton } from '@clerk/nextjs';
import {
  ArrowLeft,
  Monitor,
  CheckCircle,
  XCircle,
  Loader2,
  LogIn,
  Clock,
  Activity,
  Wrench,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';

export default function MCPSessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionId = params.sessionId as string;
  const { isLoaded, isSignedIn } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const orgId = currentOrg?.id || '';

  const revokeSession = useRevokeMCPSession();

  const { data: session, isLoading, refetch } = useQuery({
    queryKey: ['mcp-session', sessionId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/v1/mcp/connections/${sessionId}`, {
        headers: { 'X-Organization-ID': orgId },
      });
      if (!response.ok) throw new Error('Failed to fetch session');
      return response.json();
    },
    enabled: isLoaded && isSignedIn && !orgLoading && !!orgId && !!sessionId,
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['mcp-session-activity', sessionId],
    queryFn: async () => {
      const response = await authenticatedFetch(`/api/v1/mcp/connections/${sessionId}/activity`, {
        headers: { 'X-Organization-ID': orgId },
      });
      if (!response.ok) throw new Error('Failed to fetch activity');
      return response.json();
    },
    enabled: isLoaded && isSignedIn && !orgLoading && !!orgId && !!sessionId,
  });

  const activities = activityData?.activities || [];

  const handleRevoke = async () => {
    if (confirm('Are you sure you want to revoke this session? The client will need to reconnect.')) {
      await revokeSession.mutateAsync({ connectionId: sessionId, orgId });
      router.push('/mcp-sessions');
    }
  };

  // Show loading state
  if (!isLoaded || orgLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
              <p className="text-muted-foreground mt-2">
                You need to sign in to view session details
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <SignInButton mode="modal">
                <Button size="lg">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </SignInButton>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Show loading state for session data
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading session...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show not found
  if (!session) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Monitor className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Session Not Found</CardTitle>
              <p className="text-muted-foreground mt-2">
                This session may have been revoked or does not exist
              </p>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Link href="/mcp-sessions">
                <Button>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sessions
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <Link href="/mcp-sessions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-semibold">{session.client_name || session.client_type}</h1>
              <p className="text-sm text-muted-foreground">
                Session ID: {session.session_id?.slice(0, 8)}...
              </p>
            </div>
          </div>

          <Badge
            variant={session.is_active ? 'default' : 'secondary'}
            className={session.is_active ? 'bg-green-500 ml-2' : 'ml-2'}
          >
            {session.status}
          </Badge>

          <div className="flex-1" />

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-red-500 hover:bg-red-500/10"
            onClick={handleRevoke}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Revoke
          </Button>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Connected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatDistanceToNow(new Date(session.connected_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.request_count.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Tools Used
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{session.tools_used?.length || 0}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Last Activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tools Used */}
          {session.tools_used && session.tools_used.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tools Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {session.tools_used.map((tool: string) => (
                    <Badge key={tool} variant="outline">
                      {tool}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Activity Timeline</CardTitle>
                {activityLoading && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      {activity.success ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-medium truncate">
                            {activity.tool_name || activity.activity_type}
                          </span>
                          <span className="text-sm text-muted-foreground flex-shrink-0">
                            {format(new Date(activity.created_at), 'HH:mm:ss')}
                          </span>
                        </div>
                        {activity.duration_ms && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Duration: {activity.duration_ms}ms
                          </p>
                        )}
                        {activity.error_message && (
                          <p className="text-sm text-red-500 mt-1 truncate">
                            {activity.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
