/**
 * Tests for Activity Page
 *
 * Tests the activity page functionality including:
 * - Initial render and loading states
 * - Activity list display
 * - Statistics cards
 * - Real-time updates (live mode)
 * - Search functionality
 * - Filter functionality
 * - Refresh functionality
 * - Empty and error states
 * - Activity item display
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ActivityPage from '@/app/activity/page';

// Mock Next.js
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/activity',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock data
const mockActivities = [
  {
    id: 'activity-1',
    type: 'test_passed',
    title: 'Test passed',
    description: 'Login Flow test completed successfully',
    timestamp: new Date().toISOString(),
    metadata: {
      projectName: 'Test Project',
      testName: 'Login Flow',
      link: '/tests/test-1',
    },
    user: {
      id: 'user-1',
      name: 'John Doe',
    },
  },
  {
    id: 'activity-2',
    type: 'test_failed',
    title: 'Test failed',
    description: 'Checkout Flow failed at step 3',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    metadata: {
      projectName: 'Test Project',
      testName: 'Checkout Flow',
      link: '/tests/test-2',
    },
    user: {
      id: 'user-2',
      name: 'Jane Smith',
    },
  },
  {
    id: 'activity-3',
    type: 'healing_applied',
    title: 'Self-healing applied',
    description: 'Updated selector for Submit button',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    metadata: {
      projectName: 'Test Project',
    },
    user: null,
  },
  {
    id: 'activity-4',
    type: 'project_created',
    title: 'Project created',
    description: 'New project "E-commerce" was created',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    metadata: {
      projectName: 'E-commerce',
    },
    user: {
      id: 'user-1',
      name: 'John Doe',
    },
  },
  {
    id: 'activity-5',
    type: 'user_joined',
    title: 'User joined',
    description: 'Sarah Connor joined the team',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    metadata: {},
    user: {
      id: 'user-3',
      name: 'Sarah Connor',
    },
  },
  {
    id: 'activity-6',
    type: 'discovery_completed',
    title: 'Discovery completed',
    description: 'Found 5 pages and 3 flows',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    metadata: {
      projectName: 'Test Project',
      link: '/discovery',
    },
    user: null,
  },
];

const mockNewActivities = [
  {
    id: 'new-activity-1',
    type: 'test_started',
    title: 'Test started',
    description: 'Starting Payment Flow test',
    timestamp: new Date().toISOString(),
    metadata: {
      projectName: 'Test Project',
    },
    user: null,
  },
];

const mockStats = {
  lastHour: 12,
  testRuns: 45,
  healsApplied: 8,
  failures: 3,
};

// Mock hook implementations
const mockRefetch = vi.fn().mockResolvedValue({});
const mockClearNewActivities = vi.fn();

const mockUseActivityFeed = vi.fn(() => ({
  data: mockActivities,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
}));

const mockUseRealtimeActivity = vi.fn(() => ({
  newActivities: [],
  clearNewActivities: mockClearNewActivities,
}));

const mockUseActivityStats = vi.fn(() => mockStats);

vi.mock('@/lib/hooks/use-activity', () => ({
  useActivityFeed: (limit: number) => mockUseActivityFeed(),
  useRealtimeActivity: () => mockUseRealtimeActivity(),
  useActivityStats: () => mockUseActivityStats(),
}));

// Mock Sidebar
vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

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

describe('Activity Page', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();

    // Reset mock implementations
    mockUseActivityFeed.mockReturnValue({
      data: mockActivities,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockUseRealtimeActivity.mockReturnValue({
      newActivities: [],
      clearNewActivities: mockClearNewActivities,
    });

    mockUseActivityStats.mockReturnValue(mockStats);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the activity page', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    });

    it('should display subheading', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Real-time activity across all projects')).toBeInTheDocument();
    });

    it('should display Live/Paused toggle button', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /live/i })).toBeInTheDocument();
    });

    it('should display Refresh button', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should be in Live mode by default', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const liveButton = screen.getByRole('button', { name: /live/i });
      expect(liveButton).toHaveClass('bg-primary');
    });
  });

  describe('Statistics Cards', () => {
    it('should display Events (1hr) stat', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Events (1hr)')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('should display Test Runs stat', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      // "Test Runs" may appear multiple times (stat card + activity items)
      expect(screen.getAllByText('Test Runs').length).toBeGreaterThan(0);
      expect(screen.getAllByText('45').length).toBeGreaterThan(0);
    });

    it('should display Heals Applied stat', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Heals Applied')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should display Failures stat', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Failures')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Activity List', () => {
    it('should display activity items', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Test passed')).toBeInTheDocument();
      expect(screen.getByText('Test failed')).toBeInTheDocument();
      expect(screen.getByText('Self-healing applied')).toBeInTheDocument();
      expect(screen.getByText('Project created')).toBeInTheDocument();
    });

    it('should display activity descriptions', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Login Flow test completed successfully')).toBeInTheDocument();
      expect(screen.getByText('Checkout Flow failed at step 3')).toBeInTheDocument();
    });

    it('should display project name badges', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getAllByText('Test Project').length).toBeGreaterThan(0);
    });

    it('should display relative timestamps', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      // Multiple activities have timestamps
      expect(screen.getAllByText(/ago/i).length).toBeGreaterThan(0);
    });

    it('should display user info when available', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      // User names may appear multiple times in activities
      expect(screen.getAllByText(/John Doe|Jane Smith/i).length).toBeGreaterThan(0);
    });

    it('should display View link when metadata has link', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const viewLinks = screen.getAllByText('View');
      expect(viewLinks.length).toBeGreaterThan(0);
    });

    it('should display event count', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Showing 6 events')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockUseActivityFeed.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when fetch fails', () => {
      mockUseActivityFeed.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Failed to load activity')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call refetch when Retry button clicked', async () => {
      mockUseActivityFeed.mockReturnValue({
        data: [],
        isLoading: false,
        error: new Error('Failed to fetch'),
        refetch: mockRefetch,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no activities', () => {
      mockUseActivityFeed.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('No activity found')).toBeInTheDocument();
      expect(screen.getByText('Activity will appear here as you use Skopaq.')).toBeInTheDocument();
    });

    it('should show filter hint when filters applied', async () => {
      mockUseActivityFeed.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search activity...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.getByText('Try adjusting your filters to see more results.')).toBeInTheDocument();
    });
  });

  describe('Search', () => {
    it('should display search input', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByPlaceholderText('Search activity...')).toBeInTheDocument();
    });

    it('should filter activities by search query', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search activity...');
      await user.type(searchInput, 'Login');

      expect(screen.getByText('Test passed')).toBeInTheDocument();
      expect(screen.queryByText('Checkout Flow failed at step 3')).not.toBeInTheDocument();
    });

    it('should filter by project name', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const searchInput = screen.getByPlaceholderText('Search activity...');
      await user.type(searchInput, 'E-commerce');

      expect(screen.getByText('Project created')).toBeInTheDocument();
      expect(screen.queryByText('Test passed')).not.toBeInTheDocument();
    });
  });

  describe('Filter', () => {
    it('should display filter dropdown', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have All Activity selected by default', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('all');
    });

    it('should filter by Test Runs', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'tests');

      expect(screen.getByText('Test passed')).toBeInTheDocument();
      expect(screen.getByText('Test failed')).toBeInTheDocument();
      expect(screen.getByText('Discovery completed')).toBeInTheDocument();
      expect(screen.queryByText('Self-healing applied')).not.toBeInTheDocument();
    });

    it('should filter by Self-Healing', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'healing');

      expect(screen.getByText('Self-healing applied')).toBeInTheDocument();
      expect(screen.queryByText('Test passed')).not.toBeInTheDocument();
    });

    it('should filter by Projects', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'projects');

      expect(screen.getByText('Project created')).toBeInTheDocument();
      expect(screen.queryByText('Test passed')).not.toBeInTheDocument();
    });

    it('should filter by Team', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'team');

      expect(screen.getByText('User joined')).toBeInTheDocument();
      expect(screen.queryByText('Test passed')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should show new activities notification when in live mode', () => {
      mockUseRealtimeActivity.mockReturnValue({
        newActivities: mockNewActivities,
        clearNewActivities: mockClearNewActivities,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('1 new activity received')).toBeInTheDocument();
    });

    it('should show Clear button for new activities', () => {
      mockUseRealtimeActivity.mockReturnValue({
        newActivities: mockNewActivities,
        clearNewActivities: mockClearNewActivities,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('should call clearNewActivities when Clear clicked', async () => {
      mockUseRealtimeActivity.mockReturnValue({
        newActivities: mockNewActivities,
        clearNewActivities: mockClearNewActivities,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      const clearButton = screen.getByRole('button', { name: /clear/i });
      await user.click(clearButton);

      expect(mockClearNewActivities).toHaveBeenCalled();
    });

    it('should show "Updating live" indicator when in live mode', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Updating live')).toBeInTheDocument();
    });

    it('should toggle live mode when Live button clicked', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const liveButton = screen.getByRole('button', { name: /live/i });
      await user.click(liveButton);

      expect(screen.getByRole('button', { name: /paused/i })).toBeInTheDocument();
    });

    it('should not show "Updating live" when paused', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const liveButton = screen.getByRole('button', { name: /live/i });
      await user.click(liveButton);

      expect(screen.queryByText('Updating live')).not.toBeInTheDocument();
    });
  });

  describe('Refresh', () => {
    it('should call refetch and clearNewActivities when Refresh clicked', async () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockClearNewActivities).toHaveBeenCalled();
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show spinning icon when loading', () => {
      mockUseActivityFeed.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      render(<ActivityPage />, { wrapper: createWrapper() });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  describe('Activity Item Colors', () => {
    it('should show green color for passed tests', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const passedActivity = screen.getByText('Test passed').closest('[class*="flex items-start gap-4"]');
      const icon = passedActivity?.querySelector('[class*="bg-green-500/10"]');
      expect(icon).toBeInTheDocument();
    });

    it('should show red color for failed tests', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const failedActivity = screen.getByText('Test failed').closest('[class*="flex items-start gap-4"]');
      const icon = failedActivity?.querySelector('[class*="bg-red-500/10"]');
      expect(icon).toBeInTheDocument();
    });

    it('should show purple color for healing events', () => {
      render(<ActivityPage />, { wrapper: createWrapper() });

      const healingActivity = screen.getByText('Self-healing applied').closest('[class*="flex items-start gap-4"]');
      const icon = healingActivity?.querySelector('[class*="bg-purple-500/10"]');
      expect(icon).toBeInTheDocument();
    });
  });
});
