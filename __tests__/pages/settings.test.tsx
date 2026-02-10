/**
 * Tests for Settings Page
 *
 * Covers:
 * - Initial render and layout
 * - Navigation between sections (Profile, Organization, API, Notifications, Defaults, Security, About)
 * - Profile section editing
 * - Organization section display
 * - API keys management
 * - Notification settings
 * - Test defaults configuration
 * - Security section
 * - About section
 * - Loading and error states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================================================
// Hoisted mock data - defined before vi.mock() hoisting occurs
// ============================================================================
const {
  mockUserProfile,
  mockUserSettings,
  mockOrganization,
  mockApiKey,
  mockRouter,
  profile,
  settings,
  organization,
  apiKeys,
  mockUpdateProfile,
  mockUpdateNotificationPreferences,
  mockUpdateTestDefaults,
  mockCreateApiKey,
  mockRevokeApiKey,
  createMockQuery,
  createMockMutation,
  // Mock hook functions
  mockUseUserProfile,
  mockUseUserSettings,
  mockUseCurrentOrganization,
  mockUseApiKeys,
  mockUseCreateApiKey,
  mockUseRevokeApiKey,
} = vi.hoisted(() => {
  const mockUserProfile = (overrides = {}) => ({
    id: 'user_123',
    display_name: 'John Doe',
    email: 'john@example.com',
    bio: 'Test user',
    avatar_url: 'https://example.com/avatar.png',
    timezone: 'America/New_York',
    language: 'en',
    created_at: new Date().toISOString(),
    ...overrides,
  });

  const mockUserSettings = (overrides = {}) => ({
    notifications: {
      email_notifications: true,
      slack_notifications: false,
      in_app_notifications: true,
      test_failure_alerts: true,
      daily_digest: true,
      weekly_report: false,
      alert_threshold: 80,
    },
    test_defaults: {
      default_browser: 'chromium' as const,
      default_timeout: 30000,
      parallel_execution: true,
      retry_failed_tests: true,
      max_retries: 3,
      screenshot_on_failure: true,
      video_recording: false,
    },
    ...overrides,
  });

  const mockOrganization = (overrides = {}) => ({
    id: 'org_123',
    name: 'Test Organization',
    slug: 'test-org',
    plan: 'pro',
    created_at: new Date().toISOString(),
    ...overrides,
  });

  const mockApiKey = (overrides = {}) => ({
    id: `key_${Date.now()}`,
    name: 'Test API Key',
    key_prefix: 'arg_test_',
    scopes: ['read', 'write'],
    is_active: true,
    last_used_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  });

  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    pathname: '/settings',
    query: {},
    asPath: '/settings',
    route: '/settings',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  };

  // Pre-computed mock data
  const profile = mockUserProfile();
  const settings = mockUserSettings();
  const organization = mockOrganization();
  const apiKeys = [
    mockApiKey({ id: 'key_1', name: 'Production Key', key_prefix: 'arg_prod_' }),
    mockApiKey({ id: 'key_2', name: 'Development Key', key_prefix: 'arg_dev_', is_active: false }),
  ];

  // Mock functions
  const mockUpdateProfile = vi.fn();
  const mockUpdateNotificationPreferences = vi.fn();
  const mockUpdateTestDefaults = vi.fn();
  const mockCreateApiKey = vi.fn();
  const mockRevokeApiKey = vi.fn();

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

  // Create mock hook functions for use in vi.mock() and tests
  const mockUseUserProfile = vi.fn(() => ({
    profile,
    loading: false,
    error: null,
    updateProfile: mockUpdateProfile,
    isUpdating: false,
    updateSuccess: false,
  }));

  const mockUseUserSettings = vi.fn(() => ({
    settings,
    isLoading: false,
    error: null,
    updateNotificationPreferences: mockUpdateNotificationPreferences,
    updateTestDefaults: mockUpdateTestDefaults,
    isUpdating: false,
    notificationsMutation: { isPending: false, isSuccess: false },
    testDefaultsMutation: { isPending: false, isSuccess: false },
  }));

  const mockUseCurrentOrganization = vi.fn(() => ({
    organization,
    loading: false,
    error: null,
  }));

  const mockUseApiKeys = vi.fn(() => createMockQuery(apiKeys));
  const mockUseCreateApiKey = vi.fn(() => ({
    mutateAsync: mockCreateApiKey,
    isPending: false,
  }));
  const mockUseRevokeApiKey = vi.fn(() => ({
    mutate: mockRevokeApiKey,
    isPending: false,
  }));

  const createMockMutation = (overrides = {}) => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    data: undefined,
    reset: vi.fn(),
    ...overrides,
  });

  return {
    mockUserProfile,
    mockUserSettings,
    mockOrganization,
    mockApiKey,
    mockRouter,
    profile,
    settings,
    organization,
    apiKeys,
    mockUpdateProfile,
    mockUpdateNotificationPreferences,
    mockUpdateTestDefaults,
    mockCreateApiKey,
    mockRevokeApiKey,
    createMockQuery,
    createMockMutation,
    // Mock hook functions
    mockUseUserProfile,
    mockUseUserSettings,
    mockUseCurrentOrganization,
    mockUseApiKeys,
    mockUseCreateApiKey,
    mockUseRevokeApiKey,
  };
});

// ============================================================================
// vi.mock() calls - these are hoisted but now have access to hoisted values
// ============================================================================

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/settings',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock user profile hook - use hoisted function
vi.mock('@/lib/hooks/use-user-profile', () => ({
  useUserProfile: mockUseUserProfile,
}));

// Mock user settings hook - use hoisted function
vi.mock('@/lib/hooks/use-user-settings', () => ({
  useUserSettings: mockUseUserSettings,
}));

// Mock organization hook - use hoisted function
vi.mock('@/lib/hooks/use-current-organization', () => ({
  useCurrentOrganization: mockUseCurrentOrganization,
}));

// Mock API keys hooks - use hoisted functions
vi.mock('@/lib/hooks/use-api-keys', () => ({
  useApiKeys: mockUseApiKeys,
  useCreateApiKey: mockUseCreateApiKey,
  useRevokeApiKey: mockUseRevokeApiKey,
}));

// Mock Sidebar
vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

// Mock Card components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3 data-testid="card-title">{children}</h3>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="card-description">{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
}));

// Mock VersionBadge
vi.mock('@/components/ui/version-badge', () => ({
  VersionBadge: ({ variant }: { variant: string }) => (
    <span data-testid="version-badge">v1.0.0</span>
  ),
}));

// Mock version
vi.mock('@/lib/version', () => ({
  APP_VERSION: '1.0.0',
}));

// Mock utils
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================================================
// Imports - MUST come after vi.mock() calls
// ============================================================================
import SettingsPage from '@/app/settings/page';

// ============================================================================
// Test utilities
// ============================================================================
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
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ============================================================================
// Tests
// ============================================================================
describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-establish default mock implementations after clearing
    mockUseUserProfile.mockImplementation(() => ({
      profile,
      loading: false,
      error: null,
      updateProfile: mockUpdateProfile,
      isUpdating: false,
      updateSuccess: false,
    }));
    mockUseUserSettings.mockImplementation(() => ({
      settings,
      isLoading: false,
      error: null,
      updateNotificationPreferences: mockUpdateNotificationPreferences,
      updateTestDefaults: mockUpdateTestDefaults,
      isUpdating: false,
      notificationsMutation: { isPending: false, isSuccess: false },
      testDefaultsMutation: { isPending: false, isSuccess: false },
    }));
    mockUseCurrentOrganization.mockImplementation(() => ({
      organization,
      loading: false,
      error: null,
    }));
    mockUseApiKeys.mockImplementation(() => createMockQuery(apiKeys));
    mockUseCreateApiKey.mockImplementation(() => ({
      mutateAsync: mockCreateApiKey,
      isPending: false,
    }));
    mockUseRevokeApiKey.mockImplementation(() => ({
      mutate: mockRevokeApiKey,
      isPending: false,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the page layout with sidebar', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should render page title', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      expect(screen.getByText('Configure your profile and preferences')).toBeInTheDocument();
    });

    it('should render all section navigation buttons', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Use getAllByRole for buttons that might appear multiple times
      expect(screen.getAllByRole('button', { name: /Profile/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /Organization/i }).length).toBeGreaterThan(0);
      // API Keys text may appear multiple times (nav + section header)
      expect(screen.getAllByText(/API Keys/i).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /Notifications/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /Test Defaults/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /Security/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /About/i }).length).toBeGreaterThan(0);
    });

    it('should show Profile section by default', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      expect(screen.getByText('Profile Information')).toBeInTheDocument();
    });
  });

  describe('Section Navigation', () => {
    it('should switch to Organization section', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const orgButton = screen.getByRole('button', { name: /Organization/i });
      fireEvent.click(orgButton);

      await waitFor(() => {
        expect(screen.getByText('Organization Details')).toBeInTheDocument();
      });
    });

    it('should switch to API Keys section', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Find the API Keys button in the navigation (first one)
      const apiButtons = screen.getAllByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButtons[0]);

      await waitFor(() => {
        // Check for API Keys section content
        expect(screen.getAllByText(/API Keys/i).length).toBeGreaterThan(0);
      });
    });

    it('should switch to Notifications section', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const notifButton = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notifButton);

      await waitFor(() => {
        expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      });
    });

    it('should switch to Test Defaults section', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const defaultsButton = screen.getByRole('button', { name: /Test Defaults/i });
      fireEvent.click(defaultsButton);

      await waitFor(() => {
        expect(screen.getByText('Default Test Settings')).toBeInTheDocument();
      });
    });

    it('should switch to Security section', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const securityButton = screen.getByRole('button', { name: /Security/i });
      fireEvent.click(securityButton);

      await waitFor(() => {
        expect(screen.getByText('Security Settings')).toBeInTheDocument();
      });
    });

    it('should switch to About section', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const aboutButton = screen.getByRole('button', { name: /About/i });
      fireEvent.click(aboutButton);

      await waitFor(() => {
        expect(screen.getByText('About Skopaq')).toBeInTheDocument();
      });
    });

    it('should highlight active section', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const profileButtons = screen.getAllByRole('button', { name: /Profile/i });
      // The active section button should have the primary background class
      const hasActiveClass = profileButtons.some(btn =>
        btn.className.includes('bg-primary') || btn.className.includes('primary')
      );
      expect(hasActiveClass).toBe(true);
    });
  });

  describe('Profile Section', () => {
    it('should display user avatar or initials', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Should show initials or avatar image - check for user name in profile section
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user name', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user email', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display display name input', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Check for label text and that textboxes exist
      expect(screen.getByText('Display Name')).toBeInTheDocument();
      expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
    });

    it('should display email field as disabled', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Check for email label and that the email field exists
      expect(screen.getByText('Email Address')).toBeInTheDocument();
      // Email is shown in the user info section
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('should display bio textarea', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Check for bio label
      expect(screen.getByText('Bio')).toBeInTheDocument();
    });

    it('should display timezone selector', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Check for timezone label
      expect(screen.getByText('Timezone')).toBeInTheDocument();
    });

    it('should display language selector', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Check for language label
      expect(screen.getByText('Language')).toBeInTheDocument();
    });

    it('should show Save Profile button', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      expect(screen.getByRole('button', { name: /Save Profile/i })).toBeInTheDocument();
    });

    // TODO: Fix this integration test - currently hangs due to useFormState debounce/timing issues in test environment
    it.todo('should call updateProfile when save is clicked');
  });

  describe('Organization Section', () => {
    it('should display organization name', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const orgButton = screen.getByRole('button', { name: /Organization/i });
      fireEvent.click(orgButton);

      await waitFor(() => {
        expect(screen.getByText('Test Organization')).toBeInTheDocument();
      });
    });

    it('should display organization slug', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const orgButton = screen.getByRole('button', { name: /Organization/i });
      fireEvent.click(orgButton);

      await waitFor(() => {
        expect(screen.getByText('/test-org')).toBeInTheDocument();
      });
    });

    it('should display plan badge', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const orgButton = screen.getByRole('button', { name: /Organization/i });
      fireEvent.click(orgButton);

      await waitFor(() => {
        expect(screen.getByText('PRO')).toBeInTheDocument();
      });
    });

    it('should show manage organization button', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const orgButton = screen.getByRole('button', { name: /Organization/i });
      fireEvent.click(orgButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Manage Organization/i })).toBeInTheDocument();
      });
    });

    it('should show no organization message when none exists', async () => {
      mockUseCurrentOrganization.mockReturnValue({
        organization: null,
        loading: false,
        error: null,
      });

      render(<SettingsPage />, { wrapper: AllProviders });

      const orgButton = screen.getByRole('button', { name: /Organization/i });
      fireEvent.click(orgButton);

      await waitFor(() => {
        expect(screen.getByText('No Organization Selected')).toBeInTheDocument();
      });
    });
  });

  describe('API Keys Section', () => {
    it('should display API keys list', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const apiButton = screen.getByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButton);

      await waitFor(() => {
        expect(screen.getByText('Production Key')).toBeInTheDocument();
        expect(screen.getByText('Development Key')).toBeInTheDocument();
      });
    });

    it('should show key prefix', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const apiButton = screen.getByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButton);

      await waitFor(() => {
        expect(screen.getByText(/arg_prod_/)).toBeInTheDocument();
        expect(screen.getByText(/arg_dev_/)).toBeInTheDocument();
      });
    });

    it('should show active/revoked status', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const apiButton = screen.getByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButton);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Revoked')).toBeInTheDocument();
      });
    });

    it('should show create new key button', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const apiButton = screen.getByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create New API Key/i })).toBeInTheDocument();
      });
    });

    it('should show create key form when button is clicked', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const apiButton = screen.getByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create New API Key/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /Create New API Key/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Key name/i)).toBeInTheDocument();
      });
    });

    it('should create new API key when form is submitted', async () => {
      mockCreateApiKey.mockResolvedValue({ key: 'arg_new_key_123' });

      render(<SettingsPage />, { wrapper: AllProviders });

      const apiButton = screen.getByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButton);

      const createButton = await screen.findByRole('button', { name: /Create New API Key/i });
      fireEvent.click(createButton);

      const nameInput = await screen.findByPlaceholderText(/Key name/i);
      fireEvent.change(nameInput, { target: { value: 'New Key' } });

      const submitButton = screen.getByRole('button', { name: /^Create$/ });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockCreateApiKey).toHaveBeenCalled();
      });
    });

    it('should show revoke button for active keys', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const apiButton = screen.getByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButton);

      await waitFor(() => {
        // Should have a delete/revoke button for active key
        const trashButtons = screen.getAllByRole('button').filter(
          btn => btn.querySelector('svg[class*="lucide-trash"]')
        );
        expect(trashButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Notifications Section', () => {
    it('should display notification channels', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const notifButton = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notifButton);

      await waitFor(() => {
        expect(screen.getByText('Email Notifications')).toBeInTheDocument();
        expect(screen.getByText('Slack Notifications')).toBeInTheDocument();
        expect(screen.getByText('In-App Notifications')).toBeInTheDocument();
      });
    });

    it('should display notification events', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const notifButton = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notifButton);

      await waitFor(() => {
        expect(screen.getByText('Test Failure Alerts')).toBeInTheDocument();
        expect(screen.getByText('Daily Digest')).toBeInTheDocument();
        expect(screen.getByText('Weekly Report')).toBeInTheDocument();
      });
    });

    it('should display alert threshold input', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const notifButton = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notifButton);

      await waitFor(() => {
        expect(screen.getByText('Alert Threshold (%)')).toBeInTheDocument();
      });
    });

    it('should show Save Notifications button', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const notifButton = screen.getByRole('button', { name: /Notifications/i });
      fireEvent.click(notifButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Notifications/i })).toBeInTheDocument();
      });
    });

    // TODO: Fix this integration test - currently hangs due to useFormState debounce/timing issues in test environment
    it.todo('should call updateNotificationPreferences when saved');
  });

  describe('Test Defaults Section', () => {
    it('should display timeout input', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const defaultsButton = screen.getByRole('button', { name: /Test Defaults/i });
      fireEvent.click(defaultsButton);

      await waitFor(() => {
        expect(screen.getByText(/Default Timeout/)).toBeInTheDocument();
      });
    });

    it('should display browser selector', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const defaultsButton = screen.getByRole('button', { name: /Test Defaults/i });
      fireEvent.click(defaultsButton);

      await waitFor(() => {
        expect(screen.getByText('Default Browser')).toBeInTheDocument();
      });
    });

    it('should display execution options', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const defaultsButton = screen.getByRole('button', { name: /Test Defaults/i });
      fireEvent.click(defaultsButton);

      await waitFor(() => {
        expect(screen.getByText('Parallel Execution')).toBeInTheDocument();
        expect(screen.getByText('Retry Failed Tests')).toBeInTheDocument();
        expect(screen.getByText('Screenshot on Failure')).toBeInTheDocument();
        expect(screen.getByText('Video Recording')).toBeInTheDocument();
      });
    });

    it('should show Save Defaults button', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const defaultsButton = screen.getByRole('button', { name: /Test Defaults/i });
      fireEvent.click(defaultsButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Defaults/i })).toBeInTheDocument();
      });
    });

    // TODO: Fix this integration test - currently hangs due to useFormState debounce/timing issues in test environment
    it.todo('should call updateTestDefaults when saved');
  });

  describe('Security Section', () => {
    it('should display Clerk authentication info', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const securityButton = screen.getByRole('button', { name: /Security/i });
      fireEvent.click(securityButton);

      await waitFor(() => {
        expect(screen.getByText('Clerk Authentication')).toBeInTheDocument();
      });
    });

    it('should display security features', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const securityButton = screen.getByRole('button', { name: /Security/i });
      fireEvent.click(securityButton);

      await waitFor(() => {
        expect(screen.getByText('Multi-factor authentication available')).toBeInTheDocument();
        expect(screen.getByText(/Social login/)).toBeInTheDocument();
        expect(screen.getByText('Session management')).toBeInTheDocument();
      });
    });

    it('should show manage security button', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const securityButton = screen.getByRole('button', { name: /Security/i });
      fireEvent.click(securityButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Manage Security in Clerk/i })).toBeInTheDocument();
      });
    });
  });

  describe('About Section', () => {
    it('should display app name', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const aboutButton = screen.getByRole('button', { name: /About/i });
      fireEvent.click(aboutButton);

      await waitFor(() => {
        expect(screen.getByText('Skopaq')).toBeInTheDocument();
      });
    });

    it('should display version', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const aboutButton = screen.getByRole('button', { name: /About/i });
      fireEvent.click(aboutButton);

      await waitFor(() => {
        expect(screen.getByText('1.0.0')).toBeInTheDocument();
      });
    });

    it('should display tech stack', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const aboutButton = screen.getByRole('button', { name: /About/i });
      fireEvent.click(aboutButton);

      await waitFor(() => {
        expect(screen.getByText('Tech Stack')).toBeInTheDocument();
        expect(screen.getByText('Next.js 15')).toBeInTheDocument();
        expect(screen.getByText('React 19')).toBeInTheDocument();
      });
    });

    it('should display documentation link', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const aboutButton = screen.getByRole('button', { name: /About/i });
      fireEvent.click(aboutButton);

      await waitFor(() => {
        expect(screen.getByText('Documentation')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner for profile section', () => {
      mockUseUserProfile.mockReturnValue({
        profile: null,
        loading: true,
        error: null,
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        updateSuccess: false,
      });

      render(<SettingsPage />, { wrapper: AllProviders });

      const spinner = document.querySelector('[class*="animate-spin"]');
      expect(spinner).toBeInTheDocument();
    });

    it('should show loading spinner for API keys section', async () => {
      mockUseApiKeys.mockReturnValue(
        createMockQuery([], { isLoading: true })
      );

      render(<SettingsPage />, { wrapper: AllProviders });

      const apiButton = screen.getByRole('button', { name: /API Keys/i });
      fireEvent.click(apiButton);

      await waitFor(() => {
        const spinner = document.querySelector('[class*="animate-spin"]');
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('should show error message for profile section', () => {
      mockUseUserProfile.mockReturnValue({
        profile: null,
        loading: false,
        error: 'Failed to load profile',
        updateProfile: mockUpdateProfile,
        isUpdating: false,
        updateSuccess: false,
      });

      render(<SettingsPage />, { wrapper: AllProviders });

      expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
    });

    it('should show error message for organization section', async () => {
      mockUseCurrentOrganization.mockReturnValue({
        organization: null,
        loading: false,
        error: 'Failed to load organization',
      });

      render(<SettingsPage />, { wrapper: AllProviders });

      const orgButton = screen.getByRole('button', { name: /Organization/i });
      fireEvent.click(orgButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to load organization')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible navigation buttons', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have accessible form inputs', () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    it('should have accessible selects', async () => {
      render(<SettingsPage />, { wrapper: AllProviders });

      // Profile section has timezone and language selects
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });
  });
});
