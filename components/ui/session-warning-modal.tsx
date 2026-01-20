'use client';

import { useMemo } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface SessionWarningModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Time remaining in seconds before session expires */
  timeRemaining: number;
  /** Callback when user clicks "Stay Logged In" */
  onStayLoggedIn: () => void;
  /** Callback when user clicks "Log Out" */
  onLogout: () => void;
}

/**
 * Format seconds into a human-readable string (e.g., "4 minutes 30 seconds")
 */
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0 seconds';

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  const parts: string[] = [];
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  }
  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds} ${remainingSeconds === 1 ? 'second' : 'seconds'}`);
  }

  return parts.join(' ');
}

/**
 * Modal that warns users their session is about to expire.
 * Provides options to stay logged in or log out.
 */
export function SessionWarningModal({
  isOpen,
  timeRemaining,
  onStayLoggedIn,
  onLogout,
}: SessionWarningModalProps) {
  const formattedTime = useMemo(() => formatTimeRemaining(timeRemaining), [timeRemaining]);

  // Show urgency when less than 60 seconds
  const isUrgent = timeRemaining <= 60;

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-md"
        // Prevent closing by clicking outside or pressing escape
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        // Hide the close button
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className={isUrgent ? 'h-5 w-5 text-yellow-500 animate-pulse' : 'h-5 w-5 text-muted-foreground'} />
            Session Expiring Soon
          </DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity. Would you like to stay logged in?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div
            className={`
              text-center p-4 rounded-lg border
              ${isUrgent
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                : 'bg-muted/50 border-border text-foreground'
              }
            `}
          >
            <div className="text-sm text-muted-foreground mb-1">Time remaining:</div>
            <div className={`text-2xl font-mono font-semibold ${isUrgent ? 'animate-pulse' : ''}`}>
              {formattedTime}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full sm:w-auto"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
          <Button
            onClick={onStayLoggedIn}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Stay Logged In
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
