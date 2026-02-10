/**
 * @file Sidebar Component Tests
 * Tests for the Sidebar layout component and related components
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Sidebar,
  MobileSidebar,
  MobileHeader,
  MobileMenuButton,
  SidebarProvider,
  useSidebar,
} from '@/components/layout/sidebar';

// Mock scrollIntoView since JSDOM doesn't support it
Element.prototype.scrollIntoView = vi.fn();

// Mock Next.js
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, ...props }: any) => (
    <a href={href} onClick={onClick} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard',
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
  }),
}));

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  UserButton: () => <div data-testid="user-button">User Button</div>,
  useClerk: () => ({
    signOut: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock VersionBadge
vi.mock('@/components/ui/version-badge', () => ({
  VersionBadge: ({ variant }: { variant?: string }) => (
    <span data-testid="version-badge" data-variant={variant}>v1.0.0</span>
  ),
}));

// Mock OrganizationSwitcher
vi.mock('@/components/layout/org-switcher', () => ({
  OrganizationSwitcher: () => <div data-testid="org-switcher">Org Switcher</div>,
}));

// Mock Button
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

describe('Sidebar Component', () => {
  describe('Desktop Sidebar', () => {
    it('renders the sidebar element', () => {
      render(<Sidebar />);
      expect(document.querySelector('aside')).toBeInTheDocument();
    });

    it('renders the Skopaq logo', () => {
      render(<Sidebar />);
      expect(screen.getByText('Skopaq')).toBeInTheDocument();
    });

    it('renders AI Quality Intelligence subtitle', () => {
      render(<Sidebar />);
      expect(screen.getByText('AI Quality Intelligence')).toBeInTheDocument();
    });

    it('renders organization switcher', () => {
      render(<Sidebar />);
      expect(screen.getByTestId('org-switcher')).toBeInTheDocument();
    });

    it('renders search button', () => {
      render(<Sidebar />);
      expect(screen.getByText('Quick search...')).toBeInTheDocument();
    });

    it('renders keyboard shortcut hint', () => {
      render(<Sidebar />);
      expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('renders version badge', () => {
      render(<Sidebar />);
      expect(screen.getByTestId('version-badge')).toBeInTheDocument();
    });

    it('has correct styling', () => {
      render(<Sidebar />);
      const sidebar = document.querySelector('aside');
      expect(sidebar).toHaveClass('hidden', 'lg:flex', 'fixed');
    });

    it('renders user button', () => {
      render(<Sidebar />);
      expect(screen.getByTestId('user-button')).toBeInTheDocument();
    });
  });

  describe('Navigation Items', () => {
    it('renders Dashboard link', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: /Dashboard/i })).toBeInTheDocument();
    });

    it('renders Chat link with AI badge', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: /Chat/i })).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('renders Projects link', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: /Projects/i })).toBeInTheDocument();
    });

    it('renders Test Runner link', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: /Test Runner/i })).toBeInTheDocument();
    });

    it('renders Settings link', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: /Settings/i })).toBeInTheDocument();
    });

    it('renders Integrations link', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: /Integrations/i })).toBeInTheDocument();
    });

    it('highlights active nav item', () => {
      render(<Sidebar />);
      const dashboardLink = screen.getByRole('link', { name: /Dashboard/i });
      expect(dashboardLink).toHaveAttribute('data-active', 'true');
    });
  });

  describe('Section Headers', () => {
    it('renders Testing section', () => {
      render(<Sidebar />);
      expect(screen.getByText('Testing')).toBeInTheDocument();
    });

    it('renders Insights section', () => {
      render(<Sidebar />);
      expect(screen.getByText('Insights')).toBeInTheDocument();
    });

    it('renders Workspace section', () => {
      render(<Sidebar />);
      expect(screen.getByText('Workspace')).toBeInTheDocument();
    });
  });

  describe('External Links', () => {
    it('renders Documentation link', () => {
      render(<Sidebar />);
      const docsLink = screen.getByTitle('Documentation');
      expect(docsLink).toHaveAttribute('href', 'https://docs.skopaq.ai');
      expect(docsLink).toHaveAttribute('target', '_blank');
    });

    it('renders GitHub link', () => {
      render(<Sidebar />);
      const githubLink = screen.getByTitle('GitHub');
      expect(githubLink).toHaveAttribute('href', 'https://github.com/skopaq');
      expect(githubLink).toHaveAttribute('target', '_blank');
    });

    it('renders Help & Support link', () => {
      render(<Sidebar />);
      const helpLink = screen.getByTitle('Help & Support');
      expect(helpLink).toHaveAttribute('href', 'https://skopaq.ai/help');
      expect(helpLink).toHaveAttribute('target', '_blank');
    });
  });

  describe('Footer Links', () => {
    it('renders Legal link', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: 'Legal' })).toBeInTheDocument();
    });

    it('renders Privacy link', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: 'Privacy' })).toBeInTheDocument();
    });
  });
});

describe('SidebarProvider', () => {
  it('provides context to children', () => {
    const TestComponent = () => {
      const { isOpen, setIsOpen } = useSidebar();
      return (
        <div>
          <span data-testid="is-open">{String(isOpen)}</span>
          <button onClick={() => setIsOpen(true)}>Open</button>
        </div>
      );
    };

    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    expect(screen.getByTestId('is-open')).toHaveTextContent('false');
  });

  it('allows updating isOpen state', async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const { isOpen, setIsOpen } = useSidebar();
      return (
        <div>
          <span data-testid="is-open">{String(isOpen)}</span>
          <button onClick={() => setIsOpen(true)}>Open</button>
        </div>
      );
    };

    render(
      <SidebarProvider>
        <TestComponent />
      </SidebarProvider>
    );

    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('is-open')).toHaveTextContent('true');
  });

  it('throws error when used outside provider', () => {
    const TestComponent = () => {
      useSidebar();
      return null;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useSidebar must be used within a SidebarProvider'
    );
  });
});

describe('MobileMenuButton', () => {
  it('renders toggle button', () => {
    render(
      <SidebarProvider>
        <MobileMenuButton />
      </SidebarProvider>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    render(
      <SidebarProvider>
        <MobileMenuButton />
      </SidebarProvider>
    );
    expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
  });

  it('toggles sidebar state on click', async () => {
    const user = userEvent.setup();
    const TestComponent = () => {
      const { isOpen } = useSidebar();
      return <span data-testid="state">{String(isOpen)}</span>;
    };

    render(
      <SidebarProvider>
        <MobileMenuButton />
        <TestComponent />
      </SidebarProvider>
    );

    expect(screen.getByTestId('state')).toHaveTextContent('false');
    await user.click(screen.getByRole('button'));
    expect(screen.getByTestId('state')).toHaveTextContent('true');
  });
});

describe('MobileSidebar', () => {
  it('renders when context is open', () => {
    const TestWrapper = () => {
      const { setIsOpen } = useSidebar();
      React.useEffect(() => {
        setIsOpen(true);
      }, [setIsOpen]);
      return <MobileSidebar />;
    };

    render(
      <SidebarProvider>
        <TestWrapper />
      </SidebarProvider>
    );

    // Should have the aside element
    const asideElements = document.querySelectorAll('aside');
    expect(asideElements.length).toBeGreaterThan(0);
  });

  it('has backdrop when open', () => {
    const TestWrapper = () => {
      const { setIsOpen } = useSidebar();
      React.useEffect(() => {
        setIsOpen(true);
      }, [setIsOpen]);
      return <MobileSidebar />;
    };

    const { container } = render(
      <SidebarProvider>
        <TestWrapper />
      </SidebarProvider>
    );

    // Backdrop should be visible (opacity-100)
    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();
  });

  it('closes when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const TestWrapper = () => {
      const { isOpen, setIsOpen } = useSidebar();
      React.useEffect(() => {
        setIsOpen(true);
      }, [setIsOpen]);
      return (
        <div>
          <span data-testid="state">{String(isOpen)}</span>
          <MobileSidebar />
        </div>
      );
    };

    const { container } = render(
      <SidebarProvider>
        <TestWrapper />
      </SidebarProvider>
    );

    const backdrop = container.querySelector('.fixed.inset-0.z-40');
    if (backdrop) {
      await user.click(backdrop);
    }

    await waitFor(() => {
      expect(screen.getByTestId('state')).toHaveTextContent('false');
    });
  });

  it('has close button', () => {
    const TestWrapper = () => {
      const { setIsOpen } = useSidebar();
      React.useEffect(() => {
        setIsOpen(true);
      }, [setIsOpen]);
      return <MobileSidebar />;
    };

    render(
      <SidebarProvider>
        <TestWrapper />
      </SidebarProvider>
    );

    // Should have a close button in the aside
    const closeButtons = screen.getAllByRole('button');
    expect(closeButtons.length).toBeGreaterThan(0);
  });

  it('is hidden on large screens', () => {
    render(
      <SidebarProvider>
        <MobileSidebar />
      </SidebarProvider>
    );

    const asideElements = document.querySelectorAll('aside.lg\\:hidden');
    expect(asideElements.length).toBeGreaterThan(0);
  });
});

describe('MobileHeader', () => {
  it('renders the mobile header', () => {
    render(
      <SidebarProvider>
        <MobileHeader />
      </SidebarProvider>
    );
    expect(screen.getByText('Skopaq')).toBeInTheDocument();
  });

  it('renders menu button', () => {
    render(
      <SidebarProvider>
        <MobileHeader />
      </SidebarProvider>
    );
    expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
  });

  it('renders user button', () => {
    render(
      <SidebarProvider>
        <MobileHeader />
      </SidebarProvider>
    );
    expect(screen.getByTestId('user-button')).toBeInTheDocument();
  });

  it('renders sign out button', () => {
    render(
      <SidebarProvider>
        <MobileHeader />
      </SidebarProvider>
    );
    expect(screen.getByTitle('Sign out')).toBeInTheDocument();
  });

  it('is only visible on mobile (lg:hidden)', () => {
    const { container } = render(
      <SidebarProvider>
        <MobileHeader />
      </SidebarProvider>
    );
    const header = container.querySelector('.flex.lg\\:hidden');
    expect(header).toBeInTheDocument();
  });

  it('has sticky positioning', () => {
    const { container } = render(
      <SidebarProvider>
        <MobileHeader />
      </SidebarProvider>
    );
    const header = container.querySelector('.sticky');
    expect(header).toBeInTheDocument();
  });
});

describe('Theme Toggle', () => {
  it('renders theme toggle in sidebar', () => {
    render(<Sidebar />);
    // Theme toggle should be present (Sun, Moon, Monitor icons)
    const themeButtons = document.querySelectorAll('button[title]');
    expect(themeButtons.length).toBeGreaterThan(0);
  });
});

describe('Sign Out', () => {
  it('has sign out button in sidebar', () => {
    render(<Sidebar />);
    expect(screen.getByTitle('Sign out')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  it('sidebar has aside landmark role', () => {
    render(<Sidebar />);
    expect(document.querySelector('aside')).toBeInTheDocument();
  });

  it('navigation has nav element', () => {
    render(<Sidebar />);
    expect(document.querySelector('nav')).toBeInTheDocument();
  });

  it('all links are accessible', () => {
    render(<Sidebar />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('buttons have accessible names', () => {
    render(
      <SidebarProvider>
        <MobileMenuButton />
      </SidebarProvider>
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-label');
  });
});
