import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow as fnsFormatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a date value is valid
 */
export function isValidDate(date: unknown): boolean {
  if (!date) return false;
  const d = typeof date === 'string' ? new Date(date) : date;
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Safely parse a date string or return null if invalid
 */
export function safeParseDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Safely format distance to now, returns fallback if date is invalid
 */
export function safeFormatDistanceToNow(
  date: string | Date | null | undefined,
  options?: { addSuffix?: boolean },
  fallback = 'Unknown'
): string {
  if (!date) return fallback;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;
  try {
    return fnsFormatDistanceToNow(d, options);
  } catch {
    return fallback;
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

export function formatDate(date: Date | string | null | undefined, fallback = '-'): string {
  if (!date) return fallback;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return fallback;
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return fallback;
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'passed':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    case 'running':
      return 'text-blue-500';
    case 'pending':
      return 'text-yellow-500';
    default:
      return 'text-muted-foreground';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'passed':
      return 'bg-green-500/10';
    case 'failed':
      return 'bg-red-500/10';
    case 'running':
      return 'bg-blue-500/10';
    case 'pending':
      return 'bg-yellow-500/10';
    default:
      return 'bg-muted';
  }
}

/**
 * Safely extract hostname from a URL string.
 * Returns the URL as-is if parsing fails, or a fallback value if empty.
 */
export function safeHostname(url: string | null | undefined, fallback = 'Unknown'): string {
  if (!url || url.trim() === '') {
    return fallback;
  }
  try {
    return new URL(url).hostname;
  } catch {
    // Return the original URL if it's not parseable (e.g., just a domain without protocol)
    return url;
  }
}
