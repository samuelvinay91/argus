'use client';

import { useState } from 'react';
import { useMCPSessions, useRevokeMCPSession } from '@/lib/hooks/use-mcp-sessions';
import { useCurrentOrg } from '@/lib/contexts/organization-context';
import { useAuth } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import {
  Monitor,
  Clock,
  Activity,
  MoreVertical,
  Search,
  Loader2,
  LogIn,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function MCPSessionsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { currentOrg, isLoading: orgLoading } = useCurrentOrg();
  const orgId = currentOrg?.id || '';
  const [searchQuery, setSearchQuery] = useState('');

  const { data, isLoading, error, refetch } = useMCPSessions(orgId);
  const revokeSession = useRevokeMCPSession();

  const handleRevoke = async (connectionId: string) => {
    if (confirm('Are you sure you want to revoke this session? The client will need to reconnect.')) {
      await revokeSession.mutateAsync({ connectionId, orgId });
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
                You need to sign in to view MCP sessions
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

  // Show organization selection prompt
  if (!orgId) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Monitor className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Select an Organization</CardTitle>
              <p className="text-muted-foreground mt-2">
                Please select an organization to view MCP sessions
              </p>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  const { connections = [], active_count = 0, total = 0 } = data || {};

  // Filter sessions by search
  const filteredSessions = connections.filter((session) =>
    (session.client_name || session.client_type || '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">MCP Sessions</h1>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <Badge variant="outline" className="text-green-600 border-green-600/30">
              {active_count} Active
            </Badge>
            <Badge variant="outline">
              {total} Total
            </Badge>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="pt-6 text-center text-red-500">
                <p>Failed to load MCP sessions</p>
                <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          ) : filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {searchQuery ? (
                  <>
                    <p>No sessions found matching &quot;{searchQuery}&quot;</p>
                    <Button
                      variant="ghost"
                      className="mt-4"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No MCP sessions found</p>
                    <p className="text-sm mt-1">
                      Connect an IDE with the Argus MCP server to see sessions here
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredSessions.map((session) => (
                <Link key={session.id} href={`/mcp-sessions/${session.id}`}>
                  <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Monitor className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {session.client_name || session.client_type}
                            </CardTitle>
                            {session.device_name && (
                              <p className="text-sm text-muted-foreground">
                                {session.device_name}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={session.is_active ? 'default' : 'secondary'}
                            className={session.is_active ? 'bg-green-500' : ''}
                          >
                            {session.status}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-red-500"
                              onClick={(e) => {
                                e.preventDefault();
                                handleRevoke(session.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Revoke Session
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Activity className="h-4 w-4" />
                          {session.request_count} requests
                        </div>
                        <div>
                          {session.tools_used?.length || 0} tools used
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
