'use client';

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { UserButton } from '@clerk/nextjs';
import {
  MessageSquare,
  TestTube,
  Eye,
  Compass,
  BarChart3,
  Settings,
  Github,
  Zap,
  Brain,
  Globe,
  Shield,
  AlertCircle,
  FileText,
  HelpCircle,
  ExternalLink,
  Wrench,
  Users,
  Key,
  ScrollText,
  FolderKanban,
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  Table2,
  Bell,
  AlertTriangle,
  Activity,
  Building2,
  BookOpen,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VersionBadge } from '@/components/ui/version-badge';
import { Button } from '@/components/ui/button';
import { OrganizationSwitcher } from '@/components/layout/org-switcher';
import { Search } from 'lucide-react';

// Sidebar context for global state
const SidebarContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
} | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
      {children}
    </SidebarContext.Provider>
  );
}

const coreNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Overview' },
  { name: 'Projects', href: '/projects', icon: FolderKanban, description: 'Manage apps' },
  { name: 'Chat', href: '/', icon: MessageSquare, description: 'AI Assistant' },
];

const testingNavigation = [
  { name: 'Test Runner', href: '/tests', icon: TestTube, description: 'Execute tests' },
  { name: 'Discovery', href: '/discovery', icon: Compass, description: 'Find testable surfaces' },
  { name: 'Visual AI', href: '/visual', icon: Eye, description: 'Visual regression' },
  { name: 'Schedules', href: '/schedules', icon: Calendar, description: 'Scheduled runs' },
  { name: 'Parameterized', href: '/parameterized', icon: Table2, description: 'Data-driven' },
];

const analysisNavigation = [
  { name: 'Quality Audit', href: '/quality', icon: Shield, description: 'Code health' },
  { name: 'AI Insights', href: '/insights', icon: Brain, description: 'Pattern analysis' },
  { name: 'Global Testing', href: '/global', icon: Globe, description: 'Cross-browser' },
  { name: 'Intelligence', href: '/intelligence', icon: AlertCircle, description: 'Quality score' },
  { name: 'Flaky Tests', href: '/flaky', icon: AlertTriangle, description: 'Flaky detection' },
  { name: 'Self-Healing', href: '/healing', icon: Wrench, description: 'Auto-fix config' },
  { name: 'Reports', href: '/reports', icon: BarChart3, description: 'Analytics' },
];

const enterpriseNavigation = [
  { name: 'Organizations', href: '/organizations', icon: Building2, description: 'Manage orgs' },
  { name: 'Team', href: '/team', icon: Users, description: 'Manage team' },
  { name: 'API Keys', href: '/api-keys', icon: Key, description: 'API access' },
  { name: 'API Docs', href: '/api-docs', icon: BookOpen, description: 'API explorer' },
  { name: 'Audit Logs', href: '/audit', icon: ScrollText, description: 'Activity logs' },
  { name: 'Notifications', href: '/notifications', icon: Bell, description: 'Alert channels' },
  { name: 'Activity', href: '/activity', icon: Activity, description: 'Live activity' },
];

const bottomNavigation = [
  { name: 'Integrations', href: '/integrations', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const legalLinks = [
  { name: 'Legal', href: '/legal' },
  { name: 'Privacy', href: '/legal/privacy' },
  { name: 'Terms', href: '/legal/terms' },
];

// Mobile menu button component
export function MobileMenuButton() {
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="lg:hidden h-10 w-10 p-0"
      onClick={() => setIsOpen(!isOpen)}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}

// Theme toggle component
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
        <div className="h-8 w-8 rounded-md" />
        <div className="h-8 w-8 rounded-md" />
        <div className="h-8 w-8 rounded-md" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
      <button
        onClick={() => setTheme('light')}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-md transition-colors',
          theme === 'light'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Light mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-md transition-colors',
          theme === 'dark'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          'flex items-center justify-center h-8 w-8 rounded-md transition-colors',
          theme === 'system'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="System preference"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}

// Sidebar content (shared between desktop and mobile)
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const handleClick = () => {
    onNavigate?.();
  };

  const openCommandPalette = () => {
    // Dispatch keyboard event to open command palette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  // Scroll to active menu item on mount and pathname change
  useEffect(() => {
    if (navRef.current) {
      const activeLink = navRef.current.querySelector('[data-active="true"]');
      if (activeLink) {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          activeLink.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        });
      }
    }
  }, [pathname]);

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-card" />
        </div>
        <span className="font-bold text-lg tracking-tight">Argus</span>
      </div>

      {/* Organization Switcher */}
      <OrganizationSwitcher />

      {/* Search Button */}
      <div className="px-3 py-3 border-b border-border">
        <button
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 h-9 px-3 text-sm text-muted-foreground rounded-md border bg-muted/50 hover:bg-muted transition-colors"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Main Navigation */}
      <nav ref={navRef} className="flex-1 overflow-y-auto px-3 py-4">
        {/* Core Section */}
        <div className="space-y-1">
          {coreNavigation.map((item) => {
            const isActive = pathname === item.href || (item.href === '/projects' && pathname.startsWith('/projects'));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleClick}
                data-active={isActive}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className={cn(
                  'h-5 w-5 flex-shrink-0 transition-colors',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                )} />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* Testing Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Testing
          </p>
          <div className="space-y-1">
            {testingNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleClick}
                  data-active={isActive}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Analysis Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Analysis
          </p>
          <div className="space-y-1">
            {analysisNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleClick}
                  data-active={isActive}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Enterprise Section */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Enterprise
          </p>
          <div className="space-y-1">
            {enterpriseNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleClick}
                  data-active={isActive}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className={cn(
                    'h-5 w-5 flex-shrink-0 transition-colors',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                  )} />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border px-3 py-4 space-y-1">
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleClick}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.name}
            </Link>
          );
        })}

        {/* External Links */}
        <a
          href="https://docs.heyargus.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          <HelpCircle className="h-5 w-5 flex-shrink-0" />
          <span>Docs</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
        </a>

        <a
          href="https://github.com/heyargus"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
        >
          <Github className="h-5 w-5 flex-shrink-0" />
          <span>GitHub</span>
          <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
        </a>
      </div>

      {/* User Profile */}
      <div className="border-t border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9 rounded-lg",
              },
            }}
            afterSignOutUrl="/"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Account</p>
            <p className="text-xs text-muted-foreground truncate">Manage settings</p>
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Footer Links */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {legalLinks.map((link, i) => (
              <span key={link.name} className="flex items-center gap-3">
                <Link href={link.href} onClick={handleClick} className="hover:text-foreground transition-colors">
                  {link.name}
                </Link>
                {i < legalLinks.length - 1 && <span className="text-border">·</span>}
              </span>
            ))}
          </div>
          <VersionBadge variant="minimal" />
        </div>
      </div>
    </>
  );
}

// Desktop sidebar (always visible on lg+)
export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card flex-col">
      <SidebarContent />
    </aside>
  );
}

// Mobile sidebar (slide-in overlay)
export function MobileSidebar() {
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-72 border-r border-border bg-card flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 h-8 w-8 p-0"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        <SidebarContent onNavigate={() => setIsOpen(false)} />
      </aside>
    </>
  );
}

// Mobile header with menu button
export function MobileHeader() {
  return (
    <div className="flex lg:hidden items-center justify-between h-16 px-4 border-b border-border bg-card sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
              <Eye className="h-4 w-4 text-white" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight">Argus</span>
        </div>
      </div>
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-8 w-8 rounded-lg",
          },
        }}
        afterSignOutUrl="/"
      />
    </div>
  );
}
