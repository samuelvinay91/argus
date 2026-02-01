'use client';

import * as React from 'react';
import { safeFormatDistanceToNow } from '@/lib/utils';
import {
  TestTube,
  CheckCircle2,
  XCircle,
  Wrench,
  Eye,
  Compass,
  UserCircle,
  Activity,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ActivityItem {
  id: string;
  type: 'test_run' | 'test_passed' | 'test_failed' | 'healing' | 'visual' | 'discovery' | 'user_action' | 'ai_insight';
  title: string;
  description?: string;
  user?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface TeamActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

const activityIcons: Record<string, { icon: typeof TestTube; color: string; bgColor: string }> = {
  test_run: {
    icon: TestTube,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  test_passed: {
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  test_failed: {
    icon: XCircle,
    color: 'text-error',
    bgColor: 'bg-error/10',
  },
  healing: {
    icon: Wrench,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  visual: {
    icon: Eye,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  discovery: {
    icon: Compass,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  user_action: {
    icon: UserCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  ai_insight: {
    icon: Sparkles,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
};

export function TeamActivityFeed({
  activities,
  isLoading = false,
}: TeamActivityFeedProps) {
  const getActivityConfig = (type: string) => {
    return activityIcons[type] || activityIcons.user_action;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base font-medium">Team Activity</CardTitle>
        </div>
        <CardDescription>Recent activity across your projects</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-8 w-8 bg-muted animate-pulse rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 w-48 bg-muted animate-pulse rounded mb-1" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">No recent activity</p>
            <p className="text-xs text-muted-foreground">
              Activity will appear here as your team works
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-4">
              {activities.map((activity, index) => {
                const config = getActivityConfig(activity.type);
                const Icon = config.icon;
                const isLast = index === activities.length - 1;

                return (
                  <div
                    key={activity.id}
                    className={cn(
                      'relative flex gap-3 pl-1',
                      !isLast && 'pb-4'
                    )}
                  >
                    {/* Icon */}
                    <div
                      className={cn(
                        'h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                        config.bgColor
                      )}
                    >
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-snug">
                            {activity.title}
                          </p>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {activity.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {safeFormatDistanceToNow(activity.timestamp, {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {activity.user && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <UserCircle className="h-3 w-3" />
                          {activity.user}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamActivityFeedSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-muted animate-pulse rounded" />
          <div className="h-5 w-28 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 bg-muted animate-pulse rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-48 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
