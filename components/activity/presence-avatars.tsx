'use client';

import { usePresence, useProjectPresence } from '@/hooks/use-presence';
import { cn } from '@/lib/utils';

interface PresenceAvatarsProps {
  projectId?: string | null;
  maxAvatars?: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
}

export function PresenceAvatars({
  projectId,
  maxAvatars = 5,
  size = 'md',
  showCount = true,
  className,
}: PresenceAvatarsProps) {
  // Call both hooks unconditionally to follow Rules of Hooks
  const globalPresence = usePresence();
  const projectPresence = useProjectPresence(projectId ?? '');

  // Use project presence if projectId is provided, otherwise global
  const { onlineUsers, isConnected } = projectId ? projectPresence : globalPresence;

  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base',
  };

  const overlapClasses = {
    sm: '-ml-2',
    md: '-ml-3',
    lg: '-ml-4',
  };

  if (!isConnected || onlineUsers.length === 0) {
    return null;
  }

  const displayedUsers = onlineUsers.slice(0, maxAvatars);
  const remainingCount = Math.max(0, onlineUsers.length - maxAvatars);

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex">
        {displayedUsers.map((user, index) => (
          <div
            key={user.id}
            className={cn(
              'relative rounded-full border-2 border-background',
              sizeClasses[size],
              index > 0 && overlapClasses[size]
            )}
            title={`${user.name}${user.currentPage ? ` - ${user.currentPage}` : ''}`}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <div className={cn(
                'h-full w-full rounded-full bg-primary/10 flex items-center justify-center font-medium text-primary',
                sizeClasses[size]
              )}>
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Online indicator */}
            <span className={cn(
              'absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-background',
              size === 'sm' ? 'h-1.5 w-1.5' : size === 'md' ? 'h-2 w-2' : 'h-2.5 w-2.5',
              user.status === 'away' && 'bg-yellow-500',
              user.status === 'busy' && 'bg-red-500'
            )} />
          </div>
        ))}
      </div>

      {showCount && remainingCount > 0 && (
        <span className={cn(
          'ml-2 text-muted-foreground',
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        )}>
          +{remainingCount}
        </span>
      )}
    </div>
  );
}

// Compact version for small spaces
export function OnlineIndicator({ projectId }: { projectId?: string | null }) {
  // Call both hooks unconditionally to follow Rules of Hooks
  const globalPresence = usePresence();
  const projectPresence = useProjectPresence(projectId ?? '');

  // Use project presence if projectId is provided, otherwise global
  const { onlineUsers, isConnected } = projectId ? projectPresence : globalPresence;

  if (!isConnected) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-500">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Offline
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-green-500">
      <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      {onlineUsers.length > 0 ? `${onlineUsers.length + 1} online` : 'Connected'}
    </div>
  );
}
