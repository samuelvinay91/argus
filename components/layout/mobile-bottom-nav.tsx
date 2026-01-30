'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  TestTube,
  Bell,
  MessageSquare,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsDesktop } from '@/hooks/use-media-query';

/**
 * MobileBottomNav - Fixed bottom navigation for mobile
 *
 * Features:
 * - 5 primary navigation items
 * - Active state indication
 * - Badge support for notifications
 * - Hidden on desktop (lg+)
 * - Safe area padding for notched devices
 */

export interface NavItem {
  /** Navigation item label */
  label: string;
  /** Link href */
  href: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional badge count */
  badge?: number;
  /** Click handler (for items that open menus instead of navigating) */
  onClick?: () => void;
}

export interface MobileBottomNavProps {
  /** Navigation items (max 5 recommended) */
  items?: NavItem[];
  /** Handler for "More" menu click */
  onMoreClick?: () => void;
  /** Additional className */
  className?: string;
}

const defaultItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: Home },
  { label: 'Tests', href: '/tests', icon: TestTube },
  { label: 'Alerts', href: '/notifications', icon: Bell },
  { label: 'Chat', href: '/chat', icon: MessageSquare },
];

export function MobileBottomNav({
  items = defaultItems,
  onMoreClick,
  className,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  // Don't render on desktop
  if (isDesktop) {
    return null;
  }

  // Add "More" item if handler provided
  const navItems = onMoreClick
    ? [...items, { label: 'More', href: '#', icon: Menu, onClick: onMoreClick }]
    : items;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background/95 backdrop-blur-lg',
        'border-t border-border',
        'safe-area-bottom',
        'lg:hidden', // Hidden on desktop
        className
      )}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.href !== '#' && pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'flex-1 h-full px-2',
                  'touch-target',
                  'transition-colors duration-150',
                  'text-muted-foreground hover:text-foreground',
                  'active:bg-muted/50'
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center',
                'flex-1 h-full px-2',
                'touch-target',
                'transition-colors duration-150',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
                'active:bg-muted/50'
              )}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={cn(
                      'absolute -top-1 -right-1',
                      'min-w-[16px] h-4 px-1',
                      'flex items-center justify-center',
                      'text-[10px] font-bold',
                      'bg-error text-error-foreground',
                      'rounded-full'
                    )}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1 font-medium',
                  isActive && 'text-primary'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * MobileBottomNavSpacer - Adds padding to prevent content from being hidden behind nav
 *
 * Use this at the bottom of your page content when MobileBottomNav is present
 */
export function MobileBottomNavSpacer({ className }: { className?: string }) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return null;
  }

  return <div className={cn('h-20', className)} aria-hidden="true" />;
}
