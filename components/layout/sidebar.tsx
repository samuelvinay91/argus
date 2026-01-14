'use client';

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { UserButton, useClerk } from '@clerk/nextjs';
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
  Shield,
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
  Bell,
  Activity,
  Building2,
  BookOpen,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronDown,
  Sparkles,
  Search,
  HeartPulse,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VersionBadge } from '@/components/ui/version-badge';
import { Button } from '@/components/ui/button';
import { OrganizationSwitcher } from '@/components/layout/org-switcher';

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

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION STRUCTURE - Clean & Organized
// ═══════════════════════════════════════════════════════════════════════════

const mainNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat', href: '/', icon: MessageSquare, badge: 'AI' },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
];

const testingNavigation = [
  { name: 'Test Runner', href: '/tests', icon: TestTube },
  { name: 'Test Library', href: '/tests/library', icon: BookOpen },
  { name: 'Discovery', href: '/discovery', icon: Compass },
  { name: 'Visual AI', href: '/visual', icon: Eye },
  { name: 'Schedules', href: '/schedules', icon: Calendar },
];

const insightsNavigation = [
  { name: 'Quality Score', href: '/quality', icon: Shield },
  { name: 'AI Insights', href: '/insights', icon: Brain },
  { name: 'Test Health', href: '/flaky', icon: HeartPulse },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

const workspaceNavigation = [
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'API Keys', href: '/api-keys', icon: Key },
  { name: 'Activity', href: '/activity', icon: Activity },
];

const bottomNavigation = [
  { name: 'Integrations', href: '/integrations', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
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

// Theme toggle component - compact pill design
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-24 rounded-full bg-muted animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-full bg-muted/60 border border-border/50">
      {[
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
      ].map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center justify-center h-6 w-6 rounded-full transition-all duration-200',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

// Navigation item component
function NavItem({
  item,
  isActive,
  onClick,
}: {
  item: { name: string; href: string; icon: React.ElementType; badge?: string };
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      data-active={isActive}
      className={cn(
        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      )}
    >
      <item.icon
        className={cn(
          'h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
          isActive ? 'text-primary-foreground' : ''
        )}
      />
      <span className="truncate">{item.name}</span>
      {item.badge && (
        <span
          className={cn(
            'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
            isActive
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-primary/10 text-primary'
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

// Section header component
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-3 mb-2">
      <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
        {title}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

// Collapsible section component
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 w-full text-left group"
      >
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider group-hover:text-muted-foreground transition-colors">
          {title}
        </span>
        <div className="flex-1 h-px bg-border/50" />
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>
      <div
        className={cn(
          'space-y-0.5 overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Sidebar content (shared between desktop and mobile)
function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  const handleClick = () => {
    onNavigate?.();
  };

  const openCommandPalette = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/projects') return pathname.startsWith('/projects');
    return pathname === href || pathname.startsWith(href + '/');
  };

  // Scroll to active menu item on mount and pathname change
  useEffect(() => {
    if (navRef.current) {
      const activeLink = navRef.current.querySelector('[data-active="true"]');
      if (activeLink) {
        requestAnimationFrame(() => {
          activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }
  }, [pathname]);

  return (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/25">
            <Eye className="h-5 w-5 text-white" />
          </div>
          <div className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-card"></span>
          </div>
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight">Argus</span>
          <p className="text-[10px] text-muted-foreground -mt-0.5">AI Testing Platform</p>
        </div>
      </div>

      {/* Organization Switcher */}
      <div className="px-3 pb-2">
        <OrganizationSwitcher />
      </div>

      {/* Search Button */}
      <div className="px-3 pb-4">
        <button
          onClick={openCommandPalette}
          className="flex w-full items-center gap-2 h-9 px-3 text-sm text-muted-foreground rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all duration-200"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left text-xs">Quick search...</span>
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded-md border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Main Navigation */}
      <nav ref={navRef} className="flex-1 overflow-y-auto px-3 space-y-6">
        {/* Main Section */}
        <div className="space-y-0.5">
          {mainNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
            />
          ))}
        </div>

        {/* Testing Section */}
        <div className="space-y-1">
          <SectionHeader title="Testing" />
          <div className="space-y-0.5">
            {testingNavigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={isActive(item.href)}
                onClick={handleClick}
              />
            ))}
          </div>
        </div>

        {/* Insights Section */}
        <div className="space-y-1">
          <SectionHeader title="Insights" />
          <div className="space-y-0.5">
            {insightsNavigation.map((item) => (
              <NavItem
                key={item.name}
                item={item}
                isActive={isActive(item.href)}
                onClick={handleClick}
              />
            ))}
          </div>
        </div>

        {/* Workspace Section - Collapsible */}
        <CollapsibleSection title="Workspace" defaultOpen={false}>
          {workspaceNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
            />
          ))}
        </CollapsibleSection>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-border/50 px-3 py-3 space-y-0.5">
        {bottomNavigation.map((item) => (
          <NavItem
            key={item.name}
            item={item}
            isActive={isActive(item.href)}
            onClick={handleClick}
          />
        ))}

        {/* External Links - Compact */}
        <div className="flex items-center gap-1 px-1 pt-2">
          <a
            href="https://docs.heyargus.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            title="Documentation"
          >
            <BookOpen className="h-4 w-4" />
          </a>
          <a
            href="https://github.com/heyargus"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            title="GitHub"
          >
            <Github className="h-4 w-4" />
          </a>
          <a
            href="https://heyargus.ai/help"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            title="Help & Support"
          >
            <HelpCircle className="h-4 w-4" />
          </a>
          <div className="flex-1" />
          <ThemeToggle />
        </div>
      </div>

      {/* User Profile - Compact */}
      <div className="border-t border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <UserButton
            appearance={{
              elements: {
                avatarBox: 'h-9 w-9 rounded-xl',
              },
            }}
            afterSignOutUrl="/"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">Account</p>
            <p className="text-[10px] text-muted-foreground truncate">Manage profile</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Version Footer */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Link href="/legal" onClick={handleClick} className="hover:text-muted-foreground">
            Legal
          </Link>
          <span>·</span>
          <Link href="/legal/privacy" onClick={handleClick} className="hover:text-muted-foreground">
            Privacy
          </Link>
        </div>
        <VersionBadge variant="minimal" />
      </div>
    </>
  );
}

// Desktop sidebar (always visible on lg+)
export function Sidebar() {
  return (
    <aside className="hidden lg:flex fixed left-0 top-0 z-40 h-screen w-64 border-r border-border/50 bg-card/95 backdrop-blur-sm flex-col">
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
          'fixed left-0 top-0 z-50 h-screen w-72 border-r border-border/50 bg-card flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 h-8 w-8 p-0 rounded-lg"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        <SidebarContent onNavigate={() => setIsOpen(false)} />
      </aside>
    </>
  );
}

// Compact theme toggle for mobile header (cycles through themes)
function MobileThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const getIcon = () => {
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 rounded-lg"
      onClick={cycleTheme}
      title={`Theme: ${theme}`}
    >
      {getIcon()}
    </Button>
  );
}

// Mobile header with menu button
export function MobileHeader() {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="flex lg:hidden items-center justify-between h-16 px-4 border-b border-border/50 bg-card/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-md shadow-primary/20">
              <Eye className="h-4 w-4 text-white" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight">Argus</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <MobileThemeToggle />
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8 rounded-lg',
            },
          }}
          afterSignOutUrl="/"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
