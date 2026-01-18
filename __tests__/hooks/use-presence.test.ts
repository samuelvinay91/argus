/**
 * Tests for hooks/use-presence.ts
 *
 * Tests presence-related hooks including:
 * - usePresence
 * - useProjectPresence
 * - usePresenceCount
 *
 * These hooks manage real-time user presence using Supabase Realtime channels.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock Clerk
const mockUser = {
  id: 'user-123',
  primaryEmailAddress: { emailAddress: 'test@example.com' },
  fullName: 'Test User',
  username: 'testuser',
  imageUrl: 'https://example.com/avatar.jpg',
};

vi.mock('@clerk/nextjs', () => ({
  useUser: vi.fn(() => ({
    user: mockUser,
    isLoaded: true,
  })),
}));

// Create stable mock references to avoid infinite re-renders
const mockTrack = vi.fn().mockResolvedValue(undefined);
const mockUnsubscribe = vi.fn().mockResolvedValue(undefined);

// Store event handlers for simulation
let presenceHandlers: {
  sync?: () => void;
  join?: (payload: any) => void;
  leave?: (payload: any) => void;
} = {};
let subscribeCallback: ((status: string) => void) | null = null;

const createMockChannel = () => {
  const mockChannel = {
    on: vi.fn().mockImplementation((event, config, handler) => {
      if (event === 'presence') {
        if (config.event === 'sync') {
          presenceHandlers.sync = handler;
        } else if (config.event === 'join') {
          presenceHandlers.join = handler;
        } else if (config.event === 'leave') {
          presenceHandlers.leave = handler;
        }
      }
      return mockChannel;
    }),
    subscribe: vi.fn().mockImplementation((callback) => {
      subscribeCallback = callback;
      return mockChannel;
    }),
    track: mockTrack,
    unsubscribe: mockUnsubscribe,
    presenceState: vi.fn().mockReturnValue({}),
  };
  return mockChannel;
};

let mockChannel = createMockChannel();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    channel: vi.fn().mockImplementation(() => mockChannel),
  }),
}));

import { useUser } from '@clerk/nextjs';

describe('use-presence', () => {
  // Store original values for cleanup
  let originalLocationPathname: string;
  let originalDocumentHidden: boolean;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Reset handlers and callback
    presenceHandlers = {};
    subscribeCallback = null;

    // Create fresh mock channel
    mockChannel = createMockChannel();

    // Reset all mocks
    mockTrack.mockClear();
    mockUnsubscribe.mockClear();

    vi.mocked(useUser).mockReturnValue({
      user: mockUser,
      isLoaded: true,
    } as any);

    // Mock window.location.pathname without replacing entire window
    originalLocationPathname = window.location.pathname;
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/dashboard' },
      writable: true,
    });

    // Mock document.hidden without replacing entire document
    originalDocumentHidden = document.hidden;
    Object.defineProperty(document, 'hidden', {
      value: false,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    // Restore original document.hidden value
    Object.defineProperty(document, 'hidden', {
      value: originalDocumentHidden,
      writable: true,
      configurable: true,
    });
  });

  describe('usePresence', () => {
    it('should return initial state when user is not available', async () => {
      vi.mocked(useUser).mockReturnValue({
        user: null,
        isLoaded: true,
      } as any);

      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      expect(result.current.onlineUsers).toEqual([]);
      expect(result.current.isConnected).toBe(false);
    });

    it('should connect to presence channel when user is available', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      // Simulate successful subscription
      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Verify track was called with user data
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          avatarUrl: 'https://example.com/avatar.jpg',
          status: 'online',
        })
      );
    });

    it('should use custom channel name', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence({ channelName: 'custom-channel' }));

      expect((createClient() as any).channel).toHaveBeenCalledWith(
        'custom-channel',
        expect.any(Object)
      );
    });

    it('should track current page when trackPage is true', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence({ trackPage: true }));

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            currentPage: '/dashboard',
          })
        );
      });
    });

    it('should not track current page when trackPage is false', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence({ trackPage: false }));

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            currentPage: undefined,
          })
        );
      });
    });

    it('should update online users on presence sync', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      // Mock presence state with other users
      mockChannel.presenceState.mockReturnValue({
        'user-456': [
          {
            id: 'user-456',
            email: 'other@example.com',
            name: 'Other User',
            avatarUrl: 'https://example.com/other.jpg',
            currentPage: '/settings',
            lastSeen: new Date().toISOString(),
            status: 'online',
          },
        ],
        'user-789': [
          {
            id: 'user-789',
            email: 'third@example.com',
            name: 'Third User',
            lastSeen: new Date().toISOString(),
          },
        ],
      });

      // Trigger sync event
      act(() => {
        presenceHandlers.sync?.();
      });

      await waitFor(() => {
        expect(result.current.onlineUsers).toHaveLength(2);
      });

      // Current user should be filtered out
      expect(result.current.onlineUsers.find(u => u.id === 'user-123')).toBeUndefined();
      expect(result.current.onlineUsers.find(u => u.id === 'user-456')).toBeDefined();
    });

    it('should filter out current user from online users list', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      // Mock presence state including current user
      mockChannel.presenceState.mockReturnValue({
        'user-123': [
          {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            lastSeen: new Date().toISOString(),
            status: 'online',
          },
        ],
        'user-456': [
          {
            id: 'user-456',
            email: 'other@example.com',
            name: 'Other User',
            lastSeen: new Date().toISOString(),
            status: 'online',
          },
        ],
      });

      act(() => {
        presenceHandlers.sync?.();
      });

      await waitFor(() => {
        expect(result.current.onlineUsers).toHaveLength(1);
        expect(result.current.onlineUsers[0].id).toBe('user-456');
      });
    });

    it('should handle channel error status', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      // First connect
      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Then simulate error
      act(() => {
        subscribeCallback?.('CHANNEL_ERROR');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });

    it('should handle channel closed status', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      act(() => {
        subscribeCallback?.('CLOSED');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(false);
      });
    });

    it('should add event listeners for popstate and visibilitychange', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      expect(window.addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(document.addEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    it('should remove event listeners on unmount', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { unmount } = renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('popstate', expect.any(Function));
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should send heartbeat every 30 seconds', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      // Clear initial track call
      mockTrack.mockClear();

      // Advance time by 30 seconds
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'user-123',
            status: 'online',
          })
        );
      });
    });

    it('should provide updatePresence function', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Clear initial track call
      mockTrack.mockClear();

      // Call updatePresence
      await act(async () => {
        await result.current.updatePresence({ status: 'busy' });
      });

      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123',
          status: 'busy',
        })
      );
    });

    it('should handle updatePresence when channel is not connected', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      // Don't subscribe - channel is not connected

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Call updatePresence - should not throw
      await act(async () => {
        await result.current.updatePresence({ status: 'busy' });
      });

      // Track should not be called when not connected
      expect(mockTrack).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should default to anonymous name when user has no name', async () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'user-123',
          primaryEmailAddress: { emailAddress: 'test@example.com' },
          fullName: null,
          username: null,
          imageUrl: null,
        },
        isLoaded: true,
      } as any);

      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Anonymous',
          })
        );
      });
    });

    it('should use username when fullName is not available', async () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'user-123',
          primaryEmailAddress: { emailAddress: 'test@example.com' },
          fullName: null,
          username: 'johndoe',
          imageUrl: null,
        },
        isLoaded: true,
      } as any);

      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'johndoe',
          })
        );
      });
    });

    it('should log join events', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      // Trigger join event
      act(() => {
        presenceHandlers.join?.({
          key: 'user-456',
          newPresences: [{ id: 'user-456', name: 'New User' }],
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'User joined:',
        'user-456',
        expect.any(Array)
      );

      consoleSpy.mockRestore();
    });

    it('should log leave events', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      // Trigger leave event
      act(() => {
        presenceHandlers.leave?.({
          key: 'user-456',
          leftPresences: [{ id: 'user-456', name: 'Leaving User' }],
        });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'User left:',
        'user-456',
        expect.any(Array)
      );

      consoleSpy.mockRestore();
    });

    it('should set status to away when document is hidden', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      mockTrack.mockClear();

      // Get the visibilitychange handler
      const visibilityHandler = (document.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'visibilitychange'
      )?.[1];

      // Simulate document hidden
      (document as any).hidden = true;
      act(() => {
        visibilityHandler?.();
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'away',
          })
        );
      });
    });

    it('should set status to online when document becomes visible', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      mockTrack.mockClear();

      // Get the visibilitychange handler
      const visibilityHandler = (document.addEventListener as any).mock.calls.find(
        (call: any[]) => call[0] === 'visibilitychange'
      )?.[1];

      // Simulate document visible
      (document as any).hidden = false;
      act(() => {
        visibilityHandler?.();
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'online',
          })
        );
      });
    });

    it('should handle track errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockTrack.mockRejectedValueOnce(new Error('Track failed'));

      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });

      // Update presence which will fail
      await act(async () => {
        await result.current.updatePresence({ status: 'busy' });
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update presence:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('useProjectPresence', () => {
    it('should use project-specific channel when projectId is provided', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const { useProjectPresence } = await import('@/hooks/use-presence');

      renderHook(() => useProjectPresence('proj-123'));

      expect((createClient() as any).channel).toHaveBeenCalledWith(
        'argus-presence:project:proj-123',
        expect.any(Object)
      );
    });

    it('should use default channel when projectId is null', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const { useProjectPresence } = await import('@/hooks/use-presence');

      renderHook(() => useProjectPresence(null));

      expect((createClient() as any).channel).toHaveBeenCalledWith(
        'argus-presence',
        expect.any(Object)
      );
    });

    it('should return online users for project', async () => {
      const { useProjectPresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => useProjectPresence('proj-123'));

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      mockChannel.presenceState.mockReturnValue({
        'user-456': [
          {
            id: 'user-456',
            email: 'teammate@example.com',
            name: 'Team Mate',
            currentPage: '/projects/proj-123',
            lastSeen: new Date().toISOString(),
            status: 'online',
          },
        ],
      });

      act(() => {
        presenceHandlers.sync?.();
      });

      await waitFor(() => {
        expect(result.current.onlineUsers).toHaveLength(1);
        expect(result.current.onlineUsers[0].name).toBe('Team Mate');
      });
    });
  });

  describe('usePresenceCount', () => {
    it('should return count of online users', async () => {
      const { usePresenceCount } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresenceCount());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      mockChannel.presenceState.mockReturnValue({
        'user-456': [{ id: 'user-456', name: 'User 1', lastSeen: new Date().toISOString() }],
        'user-789': [{ id: 'user-789', name: 'User 2', lastSeen: new Date().toISOString() }],
        'user-101': [{ id: 'user-101', name: 'User 3', lastSeen: new Date().toISOString() }],
      });

      act(() => {
        presenceHandlers.sync?.();
      });

      await waitFor(() => {
        expect(result.current.count).toBe(3);
      });
    });

    it('should return 0 when no other users are online', async () => {
      const { usePresenceCount } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresenceCount());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      mockChannel.presenceState.mockReturnValue({});

      act(() => {
        presenceHandlers.sync?.();
      });

      await waitFor(() => {
        expect(result.current.count).toBe(0);
      });
    });

    it('should use custom channel name', async () => {
      const { createClient } = await import('@/lib/supabase/client');
      const { usePresenceCount } = await import('@/hooks/use-presence');

      renderHook(() => usePresenceCount('custom-presence-channel'));

      expect((createClient() as any).channel).toHaveBeenCalledWith(
        'custom-presence-channel',
        expect.any(Object)
      );
    });

    it('should not track page for count hook', async () => {
      const { usePresenceCount } = await import('@/hooks/use-presence');

      renderHook(() => usePresenceCount());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            currentPage: undefined,
          })
        );
      });
    });

    it('should return connection status', async () => {
      const { usePresenceCount } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresenceCount());

      expect(result.current.isConnected).toBe(false);

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty email address', async () => {
      vi.mocked(useUser).mockReturnValue({
        user: {
          id: 'user-123',
          primaryEmailAddress: null,
          fullName: 'No Email User',
          username: null,
          imageUrl: null,
        },
        isLoaded: true,
      } as any);

      const { usePresence } = await import('@/hooks/use-presence');

      renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      await waitFor(() => {
        expect(mockTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            email: '',
          })
        );
      });
    });

    it('should handle presence sync with default online status', async () => {
      const { usePresence } = await import('@/hooks/use-presence');

      const { result } = renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      // Mock presence state without status field
      mockChannel.presenceState.mockReturnValue({
        'user-456': [
          {
            id: 'user-456',
            email: 'other@example.com',
            name: 'Other User',
            lastSeen: new Date().toISOString(),
            // No status field
          },
        ],
      });

      act(() => {
        presenceHandlers.sync?.();
      });

      await waitFor(() => {
        expect(result.current.onlineUsers[0].status).toBe('online');
      });
    });

    it('should clear interval on unmount', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const { usePresence } = await import('@/hooks/use-presence');

      const { unmount } = renderHook(() => usePresence());

      act(() => {
        subscribeCallback?.('SUBSCRIBED');
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });
});
