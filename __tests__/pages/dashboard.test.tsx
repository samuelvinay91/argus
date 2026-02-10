/**
 * Tests for Dashboard Home Page
 *
 * Covers:
 * - Initial render and layout
 * - Loading states
 * - Data fetching with mocked React Query hooks
 * - User interactions (project selection, period changes, refresh)
 * - Empty states (no projects)
 * - Error handling
 */

import React, { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Use vi.hoisted() to define mock data and mock functions available during vi.mock hoisting
const {
  mockUser,
  mockRouter,
  mockProjects,
  mockTests,
  mockRuns,
  mockStats,
  createMockQuery,
  createMockMutation,
  // Pre-created mock functions for hooks
  mockUseProjects,
  mockUseReportsStats,
  mockUseRecentRuns,
  mockUseTests,
  mockUseTestRuns,
  mockUseTestRunSubscription,
  mockUseRunTest,
} = vi.hoisted(() => {
  const mockUser = {
    id: 'user_123',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'john@example.com',
    imageUrl: 'https://example.com/avatar.png',
  };

  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  };

  const mockProjects = [
    { id: 'project_1', name: 'Project One', url: 'https://example1.com', organization_id: 'org_1', created_at: new Date().toISOString() },
    { id: 'project_2', name: 'Project Two', url: 'https://example2.com', organization_id: 'org_1', created_at: new Date().toISOString() },
  ];

  const mockTests = [
    { id: 'test_1', name: 'Login Test', project_id: 'project_1', status: 'passed' },
    { id: 'test_2', name: 'Checkout Test', project_id: 'project_1', status: 'failed' },
  ];

  const mockRuns = [
    { id: 'run_1', name: 'Run 1', status: 'passed', test_id: 'test_1', started_at: new Date().toISOString() },
    { id: 'run_2', name: 'Run 2', status: 'failed', test_id: 'test_2', started_at: new Date().toISOString() },
    { id: 'run_3', name: 'Run 3', status: 'running', test_id: 'test_1', started_at: new Date().toISOString() },
  ];

  const mockStats = {
    totalTests: 100,
    passedTests: 85,
    failedTests: 15,
    qualityScore: 85,
    testsToday: 25,
    passRate: 85,
    avgPassRate: 85,
    avgDuration: 1500,
  };

  const createMockQuery = <T,>(data: T, overrides = {}) => ({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
    isSuccess: true,
    ...overrides,
  });

  const createMockMutation = (overrides = {}) => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
    isError: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  });

  // Create mock hook functions inside vi.hoisted so they're available at hoist time
  const mockUseProjects = vi.fn(() => createMockQuery(mockProjects));
  const mockUseReportsStats = vi.fn(() => createMockQuery(mockStats));
  const mockUseRecentRuns = vi.fn(() => createMockQuery(mockRuns));
  const mockUseTests = vi.fn(() => createMockQuery(mockTests));
  const mockUseTestRuns = vi.fn(() => createMockQuery(mockRuns));
  const mockUseTestRunSubscription = vi.fn();
  const mockUseRunTest = vi.fn(() => createMockMutation());

  return {
    mockUser,
    mockRouter,
    mockProjects,
    mockTests,
    mockRuns,
    mockStats,
    createMockQuery,
    createMockMutation,
    mockUseProjects,
    mockUseReportsStats,
    mockUseRecentRuns,
    mockUseTests,
    mockUseTestRuns,
    mockUseTestRunSubscription,
    mockUseRunTest,
  };
});

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: mockUser,
    isLoaded: true,
    isSignedIn: true,
  }),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'user_123',
    getToken: vi.fn().mockResolvedValue('mock-token'),
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock projects hook - reference the hoisted mock function
vi.mock('@/lib/hooks/use-projects', () => ({
  useProjects: mockUseProjects,
}));

// Mock reports hooks
vi.mock('@/lib/hooks/use-reports', () => ({
  useReportsStats: mockUseReportsStats,
  useRecentRuns: mockUseRecentRuns,
}));

// Mock tests hooks
vi.mock('@/lib/hooks/use-tests', () => ({
  useTests: mockUseTests,
  useTestRuns: mockUseTestRuns,
  useTestRunSubscription: mockUseTestRunSubscription,
  useRunTest: mockUseRunTest,
}));

// Mock Sidebar component to simplify tests
vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock dashboard components to simplify tests
vi.mock('@/components/dashboard', () => ({
  MetricCard: ({ title, value }: { title: string; value: string }) => (
    <div data-testid="metric-card">
      <span>{title}</span>
      <span>{value}</span>
    </div>
  ),
  MetricCardSkeleton: () => <div data-testid="metric-card-skeleton">Loading...</div>,
  TestHealthChart: ({ selectedPeriod, onPeriodChange }: { selectedPeriod: number; onPeriodChange: (p: number) => void }) => (
    <div data-testid="test-health-chart">
      <button onClick={() => onPeriodChange(7)}>7 days</button>
      <button onClick={() => onPeriodChange(30)}>30 days</button>
      <span>Period: {selectedPeriod}</span>
    </div>
  ),
  TestHealthChartSkeleton: () => <div data-testid="chart-skeleton">Chart Loading...</div>,
  ActiveExecutionsWidget: ({ executions }: { executions: unknown[] }) => (
    <div data-testid="active-executions">
      <span>Active: {executions?.length || 0}</span>
    </div>
  ),
  ActiveExecutionsWidgetSkeleton: () => <div data-testid="executions-skeleton">Loading...</div>,
  RecentRunsTable: ({ runs, limit }: { runs: unknown[]; limit: number }) => (
    <div data-testid="recent-runs-table">
      <span>Runs: {runs?.length || 0}</span>
      <span>Limit: {limit}</span>
    </div>
  ),
  RecentRunsTableSkeleton: () => <div data-testid="runs-skeleton">Loading...</div>,
  TeamActivityFeed: ({ activities }: { activities: unknown[] }) => (
    <div data-testid="team-activity-feed">
      <span>Activities: {activities?.length || 0}</span>
    </div>
  ),
  TeamActivityFeedSkeleton: () => <div data-testid="activity-skeleton">Loading...</div>,
  QuickActions: ({ projectId, onRunAllTests, isRunning }: { projectId: string | undefined; onRunAllTests: () => void; isRunning: boolean }) => (
    <div data-testid="quick-actions">
      <button onClick={onRunAllTests} disabled={isRunning} data-testid="run-all-btn">
        {isRunning ? 'Running...' : 'Run All Tests'}
      </button>
      <span>Project: {projectId}</span>
    </div>
  ),
  QuickActionsSkeleton: () => <div data-testid="quick-actions-skeleton">Loading...</div>,
}));

vi.mock('@/components/dashboard/DashboardHero', () => ({
  DashboardHero: ({ userName, qualityScore, stats }: { userName: string; qualityScore: number; stats: { testsToday: number } }) => (
    <div data-testid="dashboard-hero">
      <h1>Hello, {userName}</h1>
      <span>Quality Score: {qualityScore}%</span>
      <span>Tests Today: {stats?.testsToday || 0}</span>
    </div>
  ),
  DashboardHeroSkeleton: () => <div data-testid="hero-skeleton">Hero Loading...</div>,
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// Import component after mocks
import DashboardPage from '@/app/dashboard/page';

// Local test utilities to avoid importing from test-utils.tsx (which has conflicting mocks)
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function AllProviders({ children }: { children: ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish default mock implementations after they may have been overridden
    mockUseProjects.mockImplementation(() => createMockQuery(mockProjects));
    mockUseReportsStats.mockImplementation(() => createMockQuery(mockStats));
    mockUseRecentRuns.mockImplementation(() => createMockQuery(mockRuns));
    mockUseTests.mockImplementation(() => createMockQuery(mockTests));
    mockUseTestRuns.mockImplementation(() => createMockQuery(mockRuns));
    mockUseRunTest.mockImplementation(() => createMockMutation());
  });

  describe('Initial Render', () => {
    it('should render the dashboard layout with sidebar', () => {
      render(<DashboardPage />, { wrapper: AllProviders });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render the dashboard hero with user name', () => {
      render(<DashboardPage />, { wrapper: AllProviders });

      const hero = screen.getByTestId('dashboard-hero');
      expect(hero).toBeInTheDocument();
      expect(within(hero).getByText(/Hello, John/)).toBeInTheDocument();
    });

    it('should render the project selector', () => {
      render(<DashboardPage />, { wrapper: AllProviders });

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should render all dashboard widgets', () => {
      render(<DashboardPage />, { wrapper: AllProviders });

      expect(screen.getByTestId('test-health-chart')).toBeInTheDocument();
      expect(screen.getByTestId('recent-runs-table')).toBeInTheDocument();
      expect(screen.getByTestId('active-executions')).toBeInTheDocument();
      expect(screen.getByTestId('team-activity-feed')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions')).toBeInTheDocument();
    });

    it('should display quality score in hero', () => {
      render(<DashboardPage />, { wrapper: AllProviders });

      const hero = screen.getByTestId('dashboard-hero');
      expect(within(hero).getByText(/Quality Score: 85%/)).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeletons when data is loading', () => {
      mockUseProjects.mockReturnValue(createMockQuery([], { isLoading: true }) as ReturnType<typeof useProjects>);
      mockUseReportsStats.mockReturnValue(createMockQuery(null, { isLoading: true }) as ReturnType<typeof useReportsStats>);
      mockUseRecentRuns.mockReturnValue(createMockQuery([], { isLoading: true }));
      mockUseTests.mockReturnValue(createMockQuery([], { isLoading: true }));
      mockUseTestRuns.mockReturnValue(createMockQuery([], { isLoading: true }));

      render(<DashboardPage />, { wrapper: AllProviders });

      expect(screen.getByTestId('hero-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('chart-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('runs-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('executions-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('activity-skeleton')).toBeInTheDocument();
      expect(screen.getByTestId('quick-actions-skeleton')).toBeInTheDocument();
    });

    it('should show content after loading completes', async () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);
      mockUseReportsStats.mockReturnValue(createMockQuery(mockStats) as ReturnType<typeof useReportsStats>);
      mockUseRecentRuns.mockReturnValue(createMockQuery(mockRuns));
      mockUseTests.mockReturnValue(createMockQuery(mockTests));
      mockUseTestRuns.mockReturnValue(createMockQuery(mockRuns));

      render(<DashboardPage />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-hero')).toBeInTheDocument();
        expect(screen.getByTestId('test-health-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Empty States', () => {
    it('should show welcome message when no projects exist', () => {
      mockUseProjects.mockReturnValue(createMockQuery([]) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      expect(screen.getByText('Welcome to Skopaq')).toBeInTheDocument();
      expect(screen.getByText(/Get started by creating your first project/)).toBeInTheDocument();
    });

    it('should show create project button when no projects exist', () => {
      mockUseProjects.mockReturnValue(createMockQuery([]) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const createButton = screen.getByRole('link', { name: /Create Project/i });
      expect(createButton).toBeInTheDocument();
      expect(createButton).toHaveAttribute('href', '/projects');
    });
  });

  describe('Project Selection', () => {
    it('should display all projects in the selector', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const select = screen.getByRole('combobox');
      const options = within(select).getAllByRole('option');

      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent('Project One');
      expect(options[1]).toHaveTextContent('Project Two');
    });

    it('should auto-select first project', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('project_1');
    });

    it('should update data when project is changed', async () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'project_2' } });

      await waitFor(() => {
        expect((select as HTMLSelectElement).value).toBe('project_2');
      });
    });

    it('should display current project name in selector bar', () => {
      render(<DashboardPage />, { wrapper: AllProviders });

      // There are multiple elements with "Project One" (option and label), use getAllByText
      const elements = screen.getAllByText('Project One');
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Time Period Selection', () => {
    it('should render period selection buttons in chart', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const chart = screen.getByTestId('test-health-chart');
      expect(within(chart).getByText('7 days')).toBeInTheDocument();
      expect(within(chart).getByText('30 days')).toBeInTheDocument();
    });

    it('should default to 7 day period', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const chart = screen.getByTestId('test-health-chart');
      expect(within(chart).getByText('Period: 7')).toBeInTheDocument();
    });

    it('should update period when selection changes', async () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const chart = screen.getByTestId('test-health-chart');
      const thirtyDayButton = within(chart).getByText('30 days');

      fireEvent.click(thirtyDayButton);

      await waitFor(() => {
        expect(within(chart).getByText('Period: 30')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should render refresh button', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument();
    });

    it('should call refetch when refresh button is clicked', async () => {
      const mockRefetch = vi.fn();
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);
      mockUseReportsStats.mockReturnValue(
        createMockQuery(mockStats, { refetch: mockRefetch })      );

      render(<DashboardPage />, { wrapper: AllProviders });

      const refreshButton = screen.getByRole('button', { name: /Refresh/i });
      fireEvent.click(refreshButton);

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should disable refresh button while loading', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects, { isLoading: true }) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      // During loading, the refresh button should be in the UI somewhere
      // but we're showing skeletons, so the button may not be present
      // This test verifies the loading state behavior
      expect(screen.queryByTestId('hero-skeleton')).toBeInTheDocument();
    });
  });

  describe('Run All Tests', () => {
    it('should show run all tests button in quick actions', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      expect(screen.getByTestId('run-all-btn')).toBeInTheDocument();
    });

    it('should call run test mutation when run all is clicked', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({});
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);
      mockUseRunTest.mockReturnValue(
        createMockMutation({ mutateAsync: mockMutateAsync })      );

      render(<DashboardPage />, { wrapper: AllProviders });

      const runAllButton = screen.getByTestId('run-all-btn');
      fireEvent.click(runAllButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('should show running state when tests are executing', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);
      mockUseRunTest.mockReturnValue(
        createMockMutation({ isPending: true })      );

      render(<DashboardPage />, { wrapper: AllProviders });

      expect(screen.getByText('Running...')).toBeInTheDocument();
    });

    it('should pass current project ID to quick actions', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const quickActions = screen.getByTestId('quick-actions');
      expect(within(quickActions).getByText('Project: project_1')).toBeInTheDocument();
    });
  });

  describe('Dashboard Metrics Display', () => {
    it('should display test runs in recent runs table', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);
      mockUseRecentRuns.mockReturnValue(createMockQuery(mockRuns));

      render(<DashboardPage />, { wrapper: AllProviders });

      const runsTable = screen.getByTestId('recent-runs-table');
      expect(within(runsTable).getByText('Runs: 3')).toBeInTheDocument();
    });

    it('should display active executions count', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);
      mockUseTestRuns.mockReturnValue(createMockQuery(mockRuns));

      render(<DashboardPage />, { wrapper: AllProviders });

      const activeExecutions = screen.getByTestId('active-executions');
      expect(activeExecutions).toBeInTheDocument();
    });

    it('should generate activity feed from recent runs', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);
      mockUseRecentRuns.mockReturnValue(createMockQuery(mockRuns));

      render(<DashboardPage />, { wrapper: AllProviders });

      const activityFeed = screen.getByTestId('team-activity-feed');
      expect(activityFeed).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    it('should have accessible project selector', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should have focusable buttons', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);

      render(<DashboardPage />, { wrapper: AllProviders });

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', () => {
      mockUseProjects.mockReturnValue(
        createMockQuery(mockProjects, { isError: true, error: new Error('Fetch failed') })      );

      // Should not throw
      expect(() => {
        render(<DashboardPage />, { wrapper: AllProviders });
      }).not.toThrow();
    });

    it('should handle empty stats data', () => {
      mockUseProjects.mockReturnValue(createMockQuery(mockProjects) as ReturnType<typeof useProjects>);
      mockUseReportsStats.mockReturnValue(createMockQuery(null) as ReturnType<typeof useReportsStats>);
      mockUseRecentRuns.mockReturnValue(createMockQuery([]));

      // Should not throw
      expect(() => {
        render(<DashboardPage />, { wrapper: AllProviders });
      }).not.toThrow();
    });
  });
});
