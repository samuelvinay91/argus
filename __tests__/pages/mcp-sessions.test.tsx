/**
 * Tests for MCP Sessions Page
 *
 * Tests the MCP sessions page functionality including:
 * - Initial render and loading states
 * - Authentication states (signed in/out)
 * - Organization selection
 * - Session list display
 * - Search functionality
 * - Session revocation
 * - Empty states
 * - Error handling
 * - Refresh functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MCPSessionsPage from '@/app/(dashboard)/mcp-sessions/page';

// Mock Next.js
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/mcp-sessions',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href} onClick={(e) => { e.preventDefault(); mockPush(href); }}>
      {children}
    </a>
  ),
}));

// Mock Clerk
let mockIsLoaded = true;
let mockIsSignedIn = true;

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isLoaded: mockIsLoaded,
    isSignedIn: mockIsSignedIn,
    userId: 'test-user-id',
    getToken: vi.fn().mockResolvedValue('test-token'),
  }),
  SignInButton: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sign-in-button">{children}</div>
  ),
}));

// Mock organization context
let mockCurrentOrg: { id: string; name: string } | null = {
  id: 'org-123',
  name: 'Test Organization',
};
let mockOrgLoading = false;

vi.mock('@/lib/contexts/organization-context', () => ({
  useCurrentOrg: () => ({
    currentOrg: mockCurrentOrg,
    isLoading: mockOrgLoading,
  }),
}));

// Mock data
const mockSessions = [
  {
    id: 'session-1',
    org_id: 'org-123',
    client_type: 'vscode',
    client_name: 'VS Code Extension',
    device_name: 'MacBook Pro',
    status: 'active',
    is_active: true,
    last_activity_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    request_count: 150,
    tools_used: ['run_test', 'get_status', 'create_test'],
  },
  {
    id: 'session-2',
    org_id: 'org-123',
    client_type: 'cursor',
    client_name: 'Cursor IDE',
    device_name: 'Windows Desktop',
    status: 'idle',
    is_active: true,
    last_activity_at: new Date(Date.now() - 300000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    request_count: 45,
    tools_used: ['run_test'],
  },
  {
    id: 'session-3',
    org_id: 'org-123',
    client_type: 'cli',
    client_name: 'Skopaq CLI',
    device_name: null,
    status: 'disconnected',
    is_active: false,
    last_activity_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: new Date(Date.now() - 259200000).toISOString(),
    request_count: 10,
    tools_used: [],
  },
];

// Mock hooks
const mockRefetch = vi.fn();
const mockRevoke = vi.fn().mockResolvedValue({});

const mockUseMCPSessions = vi.fn(() => ({
  data: {
    connections: mockSessions,
    active_count: 2,
    total: 3,
  },
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

const mockUseRevokeMCPSession = vi.fn(() => ({
  mutateAsync: mockRevoke,
  isPending: false,
}));

vi.mock('@/lib/hooks/use-mcp-sessions', () => ({
  useMCPSessions: (orgId: string) => mockUseMCPSessions(),
  useRevokeMCPSession: () => mockUseRevokeMCPSession(),
}));

// Mock Sidebar
vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

// Mock confirm dialog
const originalConfirm = window.confirm;

// Create wrapper with providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('MCP Sessions Page', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();

    // Reset mock states
    mockIsLoaded = true;
    mockIsSignedIn = true;
    mockCurrentOrg = { id: 'org-123', name: 'Test Organization' };
    mockOrgLoading = false;

    // Reset mock implementations
    mockUseMCPSessions.mockReturnValue({
      data: {
        connections: mockSessions,
        active_count: 2,
        total: 3,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseRevokeMCPSession.mockReturnValue({
      mutateAsync: mockRevoke,
      isPending: false,
    });

    window.confirm = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.confirm = originalConfirm;
  });

  describe('Initial Render', () => {
    it('should render the MCP sessions page', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByText('MCP Sessions')).toBeInTheDocument();
    });

    it('should display active and total session badges', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('2 Active')).toBeInTheDocument();
      expect(screen.getByText('3 Total')).toBeInTheDocument();
    });

    it('should display search input', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByPlaceholderText('Search sessions...')).toBeInTheDocument();
    });

    it('should display refresh button', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when auth is not loaded', () => {
      mockIsLoaded = false;

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show loading state when organization is loading', () => {
      mockOrgLoading = true;

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show loading state when sessions are loading', () => {
      mockUseMCPSessions.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('should show sign-in prompt when not authenticated', () => {
      mockIsSignedIn = false;

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Sign In Required')).toBeInTheDocument();
      expect(screen.getByText('You need to sign in to view MCP sessions')).toBeInTheDocument();
      expect(screen.getByTestId('sign-in-button')).toBeInTheDocument();
    });
  });

  describe('Organization Selection', () => {
    it('should show organization selection prompt when no org selected', () => {
      mockCurrentOrg = null;

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Select an Organization')).toBeInTheDocument();
      expect(screen.getByText('Please select an organization to view MCP sessions')).toBeInTheDocument();
    });
  });

  describe('Session List', () => {
    it('should display session cards', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('VS Code Extension')).toBeInTheDocument();
      expect(screen.getByText('Cursor IDE')).toBeInTheDocument();
      expect(screen.getByText('Skopaq CLI')).toBeInTheDocument();
    });

    it('should display device names for sessions', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
      expect(screen.getByText('Windows Desktop')).toBeInTheDocument();
    });

    it('should display session status badges', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('idle')).toBeInTheDocument();
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });

    it('should display request counts', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('150 requests')).toBeInTheDocument();
      expect(screen.getByText('45 requests')).toBeInTheDocument();
      expect(screen.getByText('10 requests')).toBeInTheDocument();
    });

    it('should display tools used count', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('3 tools used')).toBeInTheDocument();
      expect(screen.getByText('1 tools used')).toBeInTheDocument();
      expect(screen.getByText('0 tools used')).toBeInTheDocument();
    });

    it('should display relative time for last activity', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      // Should show "less than a minute ago" or similar (multiple sessions have timestamps)
      expect(screen.getAllByText(/ago/i).length).toBeGreaterThan(0);
    });

    it('should navigate to session detail when card clicked', async () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const firstCard = screen.getByText('VS Code Extension').closest('a');
      if (firstCard) {
        await user.click(firstCard);

        expect(mockPush).toHaveBeenCalledWith('/mcp-sessions/session-1');
      }
    });
  });

  describe('Search', () => {
    it('should filter sessions by search query', async () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      await user.type(searchInput, 'VS Code');

      expect(screen.getByText('VS Code Extension')).toBeInTheDocument();
      expect(screen.queryByText('Cursor IDE')).not.toBeInTheDocument();
    });

    it('should show empty state with clear button when search has no results', async () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('No sessions found matching "nonexistent"')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument();
    });

    it('should clear search when Clear search button clicked', async () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      await user.type(searchInput, 'nonexistent');

      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      expect(screen.getByText('VS Code Extension')).toBeInTheDocument();
    });
  });

  describe('Refresh', () => {
    it('should call refetch when refresh button clicked', async () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Session Revocation', () => {
    it('should show revoke option in dropdown menu', async () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      // Find and click dropdown trigger
      const moreButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg.lucide-more-vertical');
        return svg !== null;
      });

      if (moreButtons.length > 0) {
        await user.click(moreButtons[0]);

        expect(screen.getByText('Revoke Session')).toBeInTheDocument();
      }
    });

    it('should confirm before revoking session', async () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg.lucide-more-vertical');
        return svg !== null;
      });

      if (moreButtons.length > 0) {
        await user.click(moreButtons[0]);

        const revokeButton = screen.getByText('Revoke Session');
        await user.click(revokeButton);

        expect(window.confirm).toHaveBeenCalledWith(
          'Are you sure you want to revoke this session? The client will need to reconnect.'
        );
      }
    });

    it('should call revoke mutation when confirmed', async () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg.lucide-more-vertical');
        return svg !== null;
      });

      if (moreButtons.length > 0) {
        await user.click(moreButtons[0]);

        const revokeButton = screen.getByText('Revoke Session');
        await user.click(revokeButton);

        expect(mockRevoke).toHaveBeenCalledWith({
          connectionId: 'session-1',
          orgId: 'org-123',
        });
      }
    });

    it('should not revoke when cancelled', async () => {
      window.confirm = vi.fn().mockReturnValue(false);

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const moreButtons = screen.getAllByRole('button').filter(btn => {
        const svg = btn.querySelector('svg.lucide-more-vertical');
        return svg !== null;
      });

      if (moreButtons.length > 0) {
        await user.click(moreButtons[0]);

        const revokeButton = screen.getByText('Revoke Session');
        await user.click(revokeButton);

        expect(mockRevoke).not.toHaveBeenCalled();
      }
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no sessions', () => {
      mockUseMCPSessions.mockReturnValue({
        data: {
          connections: [],
          active_count: 0,
          total: 0,
        },
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('No MCP sessions found')).toBeInTheDocument();
      expect(screen.getByText('Connect an IDE with the Skopaq MCP server to see sessions here')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error state when fetch fails', () => {
      mockUseMCPSessions.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load MCP sessions')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should retry when Try Again button clicked', async () => {
      mockUseMCPSessions.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Active Status Styling', () => {
    it('should show green badge for active sessions', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const activeBadge = screen.getByText('active');
      expect(activeBadge).toHaveClass('bg-green-500');
    });

    it('should show secondary badge for inactive sessions', () => {
      render(<MCPSessionsPage />, { wrapper: createWrapper() });

      const disconnectedBadge = screen.getByText('disconnected');
      expect(disconnectedBadge).not.toHaveClass('bg-green-500');
    });
  });
});
