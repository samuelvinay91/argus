'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Plus,
  BarChart3,
  Calendar,
  Compass,
  Eye,
  Settings,
  Zap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: typeof Play;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary';
  disabled?: boolean;
}

interface QuickActionsProps {
  projectId?: string;
  onRunAllTests?: () => void;
  onCreateTest?: () => void;
  isRunning?: boolean;
}

export function QuickActions({
  projectId,
  onRunAllTests,
  onCreateTest,
  isRunning = false,
}: QuickActionsProps) {
  const router = useRouter();

  // Handle navigation with explicit router.push to avoid React 18 transition delays
  const handleNavigation = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    router.push(href);
  };

  const actions: QuickAction[] = [
    {
      id: 'run-all',
      label: 'Run All Tests',
      description: 'Execute full test suite',
      icon: Play,
      onClick: onRunAllTests,
      variant: 'primary',
      disabled: isRunning || !projectId,
    },
    {
      id: 'create-test',
      label: 'Create Test',
      description: 'Add a new test case',
      icon: Plus,
      onClick: onCreateTest,
      disabled: !projectId,
    },
    {
      id: 'view-reports',
      label: 'View Reports',
      description: 'Analytics & insights',
      icon: BarChart3,
      href: '/reports',
    },
    {
      id: 'discovery',
      label: 'Discover',
      description: 'Find testable surfaces',
      icon: Compass,
      href: '/discovery',
      disabled: !projectId,
    },
    {
      id: 'visual-test',
      label: 'Visual Testing',
      description: 'Visual regression',
      icon: Eye,
      href: '/visual',
      disabled: !projectId,
    },
    {
      id: 'schedules',
      label: 'Schedules',
      description: 'Configure automation',
      icon: Calendar,
      href: '/settings#schedules',
    },
    {
      id: 'integrations',
      label: 'Integrations',
      description: 'Connect services',
      icon: Zap,
      href: '/integrations',
    },
    {
      id: 'settings',
      label: 'Settings',
      description: 'Project configuration',
      icon: Settings,
      href: '/settings',
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            const isPrimary = action.variant === 'primary';

            const content = (
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-2 p-4 rounded-lg border transition-all',
                  'text-center min-h-[100px]',
                  action.disabled
                    ? 'opacity-50 cursor-not-allowed bg-muted/30'
                    : isPrimary
                    ? 'bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/40 cursor-pointer'
                    : 'bg-card hover:bg-muted/50 cursor-pointer',
                  isRunning && action.id === 'run-all' && 'animate-pulse'
                )}
              >
                <div
                  className={cn(
                    'h-10 w-10 rounded-lg flex items-center justify-center',
                    isPrimary ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    isPrimary && 'text-primary'
                  )}>
                    {isRunning && action.id === 'run-all' ? 'Running...' : action.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </div>
              </div>
            );

            if (action.href && !action.disabled) {
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  onClick={(e) => handleNavigation(e, action.href!)}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={action.id}
                onClick={() => !action.disabled && action.onClick?.()}
              >
                {content}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for sidebar or smaller spaces
export function QuickActionsCompact({
  projectId,
  onRunAllTests,
  isRunning = false,
}: {
  projectId?: string;
  onRunAllTests?: () => void;
  isRunning?: boolean;
}) {
  const router = useRouter();

  // Handle navigation with explicit router.push to avoid React 18 transition delays
  const handleNavigation = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    router.push(href);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        onClick={onRunAllTests}
        disabled={isRunning || !projectId}
        className="gap-2"
      >
        {isRunning ? (
          <div className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {isRunning ? 'Running...' : 'Run Tests'}
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/reports" className="gap-2" onClick={(e) => handleNavigation(e, '/reports')}>
          <BarChart3 className="h-4 w-4" />
          Reports
        </Link>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href="/discovery" className="gap-2" onClick={(e) => handleNavigation(e, '/discovery')}>
          <Compass className="h-4 w-4" />
          Discover
        </Link>
      </Button>
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-5 w-28 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border min-h-[100px]"
            >
              <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
              <div className="space-y-1 w-full">
                <div className="h-4 w-20 bg-muted animate-pulse rounded mx-auto" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
