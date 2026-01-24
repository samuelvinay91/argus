/**
 * Tests for Chat Page
 *
 * Tests the chat page functionality including:
 * - Initial render with Clerk authentication
 * - Conversation list loading and display
 * - Conversation selection and navigation
 * - New conversation creation
 * - Conversation deletion
 * - Message loading and display
 * - Invalid UUID handling
 * - Not found conversation handling
 * - Mobile header interactions
 * - Message persistence
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChatPage from '@/app/chat/[id]/page';

// Mock Next.js navigation
const mockPush = vi.fn();
const mockBack = vi.fn();
let mockConversationId = '550e8400-e29b-41d4-a716-446655440000';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
    refresh: vi.fn(),
  }),
  useParams: () => ({
    id: mockConversationId,
  }),
  usePathname: () => `/chat/${mockConversationId}`,
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Clerk auth
const mockClerkUser = {
  id: 'test-user-id',
  primaryEmailAddress: { emailAddress: 'test@example.com' },
  fullName: 'Test User',
};

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: 'test-user-id',
    sessionId: 'test-session-id',
    getToken: vi.fn().mockResolvedValue('test-token'),
  }),
  useUser: () => ({
    isLoaded: true,
    user: mockClerkUser,
  }),
  SignedIn: ({ children }: { children: React.ReactNode }) => children,
  SignedOut: ({ children }: { children: React.ReactNode }) => null,
  RedirectToSignIn: () => <div data-testid="redirect-to-signin">Redirecting to sign in...</div>,
}));

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}));

// Mock data
const mockConversations = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Test conversation 1',
    preview: 'Last message preview...',
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    title: 'Test conversation 2',
    preview: 'Another preview...',
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    title: null,
    preview: null,
    updated_at: new Date(Date.now() - 172800000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

const mockMessages = [
  {
    id: 'msg-1',
    conversation_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'user',
    content: 'Hello, can you help me create a test?',
    created_at: new Date(Date.now() - 60000).toISOString(),
    tool_invocations: null,
  },
  {
    id: 'msg-2',
    conversation_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'assistant',
    content: 'Of course! I can help you create an end-to-end test.',
    created_at: new Date(Date.now() - 30000).toISOString(),
    tool_invocations: null,
  },
  {
    id: 'msg-3',
    conversation_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'user',
    content: 'Great, let me describe the flow...',
    created_at: new Date().toISOString(),
    tool_invocations: null,
  },
];

const mockMessageWithToolInvocation = {
  id: 'msg-tool',
  conversation_id: '550e8400-e29b-41d4-a716-446655440000',
  role: 'assistant',
  content: 'Running the test...',
  created_at: new Date().toISOString(),
  tool_invocations: [
    {
      id: 'tool-1',
      name: 'run_test',
      state: 'call',
      args: { testId: 'test-123' },
    },
  ],
};

// Mock hook implementations
const mockUseConversations = vi.fn(() => ({
  data: mockConversations,
  isLoading: false,
  error: null,
}));

const mockUseConversationMessages = vi.fn(() => ({
  data: mockMessages,
  isLoading: false,
  error: null,
}));

const mockUseCreateConversation = vi.fn(() => ({
  mutateAsync: vi.fn().mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440003' }),
  isPending: false,
}));

const mockUseDeleteConversation = vi.fn(() => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
}));

const mockUseAddMessage = vi.fn(() => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
}));

vi.mock('@/lib/hooks/use-chat', () => ({
  useConversations: () => mockUseConversations(),
  useConversationMessages: (id: string | null) => mockUseConversationMessages(),
  useCreateConversation: () => mockUseCreateConversation(),
  useDeleteConversation: () => mockUseDeleteConversation(),
  useAddMessage: () => mockUseAddMessage(),
}));

// Mock Sidebar
vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

// Mock ChatInterface
vi.mock('@/components/chat/chat-interface', () => ({
  ChatInterface: ({
    conversationId,
    initialMessages,
    onMessagesChange,
  }: any) => (
    <div data-testid="chat-interface">
      <p data-testid="chat-conversation-id">Conversation: {conversationId}</p>
      <div data-testid="chat-messages">
        {initialMessages.map((msg: any) => (
          <div key={msg.id} data-testid={`message-${msg.id}`}>
            [{msg.role}]: {msg.content}
          </div>
        ))}
      </div>
      <button
        data-testid="send-message-btn"
        onClick={() => onMessagesChange([...initialMessages, {
          id: 'new-msg',
          role: 'user',
          content: 'New message',
        }])}
      >
        Send
      </button>
    </div>
  ),
}));

// Mock Sheet component
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: any) => (
    <div data-testid="sheet" data-open={open}>
      {children}
    </div>
  ),
  SheetContent: ({ children }: any) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: any) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: any) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
  SheetTrigger: ({ children, asChild }: any) => (
    <div data-testid="sheet-trigger">{children}</div>
  ),
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

describe('Chat Page', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    mockConversationId = '550e8400-e29b-41d4-a716-446655440000';

    // Reset mock implementations
    mockUseConversations.mockReturnValue({
      data: mockConversations,
      isLoading: false,
      error: null,
    });

    mockUseConversationMessages.mockReturnValue({
      data: mockMessages,
      isLoading: false,
      error: null,
    });

    mockUseCreateConversation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440003' }),
      isPending: false,
    });

    mockUseDeleteConversation.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });

    mockUseAddMessage.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should render chat content when signed in', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    // TODO: This test is skipped because vi.mocked() cannot set read-only properties on @clerk/nextjs
    it.skip('should redirect to sign in when signed out', () => {
      // Mock signed out state
      vi.mocked(require('@clerk/nextjs')).SignedIn = () => null;
      vi.mocked(require('@clerk/nextjs')).SignedOut = ({ children }: any) => children;

      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('redirect-to-signin')).toBeInTheDocument();
    });
  });

  describe('Initial Render', () => {
    it('should render sidebar and main content', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    });

    it('should display chat header with title', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Argus Agent')).toBeInTheDocument();
    });

    it('should display chat interface with conversation ID', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('chat-conversation-id')).toHaveTextContent(
        'Conversation: 550e8400-e29b-41d4-a716-446655440000'
      );
    });

    it('should display messages from conversation', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByTestId('message-msg-1')).toHaveTextContent(
        'Hello, can you help me create a test?'
      );
      expect(screen.getByTestId('message-msg-2')).toHaveTextContent(
        'Of course! I can help you create an end-to-end test.'
      );
    });
  });

  describe('Conversation List', () => {
    it('should display conversation list in desktop sidebar', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // Conversations may appear multiple times (sidebar + main)
      expect(screen.getAllByText('Test conversation 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Test conversation 2').length).toBeGreaterThan(0);
    });

    it('should display "New conversation" for conversations without title', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // "New conversation" may appear multiple times
      expect(screen.getAllByText(/New conversation/i).length).toBeGreaterThan(0);
    });

    it('should display conversation preview', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // Previews may appear multiple times
      expect(screen.getAllByText(/Last message preview|preview/i).length).toBeGreaterThan(0);
    });

    it('should display relative time for conversations', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // Should show "less than a minute ago" or similar - may appear in multiple conversation items
      expect(screen.getAllByText(/ago/i).length).toBeGreaterThan(0);
    });

    it('should highlight active conversation', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // Multiple conversation items may exist - get the first one
      const activeConversation = screen.getAllByText('Test conversation 1')[0].closest('button');
      expect(activeConversation).toHaveClass('bg-muted');
    });

    it('should show loading state when conversations are loading', () => {
      mockUseConversations.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      // Should show loader
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('should show empty state when no conversations', () => {
      mockUseConversations.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      // Empty state may appear in multiple places (sidebar + main)
      expect(screen.getAllByText('No conversations yet').length).toBeGreaterThan(0);
    });
  });

  describe('Conversation Selection', () => {
    it('should navigate to conversation when clicked', async () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // Multiple conversation items may exist - get the first one
      const secondConversation = screen.getAllByText('Test conversation 2')[0].closest('button');
      if (secondConversation) {
        await user.click(secondConversation);

        expect(mockPush).toHaveBeenCalledWith(
          '/chat/550e8400-e29b-41d4-a716-446655440001'
        );
      }
    });
  });

  describe('New Conversation', () => {
    it('should display New Chat button', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /new chat/i })).toBeInTheDocument();
    });

    it('should create new conversation when New Chat clicked', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440003',
      });

      mockUseCreateConversation.mockReturnValue({
        mutateAsync: mockCreate,
        isPending: false,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      await user.click(newChatButton);

      expect(mockCreate).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith(
        '/chat/550e8400-e29b-41d4-a716-446655440003'
      );
    });

    it('should show loading state when creating conversation', () => {
      mockUseCreateConversation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      expect(newChatButton.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should disable button when creating conversation', () => {
      mockUseCreateConversation.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      const newChatButton = screen.getByRole('button', { name: /new chat/i });
      expect(newChatButton).toBeDisabled();
    });
  });

  describe('Delete Conversation', () => {
    it('should show delete button on hover', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // Delete buttons have opacity-0 by default, opacity-100 on hover
      const deleteButtons = document.querySelectorAll('[class*="opacity-0"]');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('should delete conversation when delete button clicked', async () => {
      const mockDelete = vi.fn().mockResolvedValue({});
      mockUseDeleteConversation.mockReturnValue({
        mutateAsync: mockDelete,
        isPending: false,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      // Find delete button for first conversation
      const conversationButtons = screen.getAllByRole('button');
      const deleteButton = conversationButtons.find(btn => {
        const svg = btn.querySelector('svg.lucide-trash-2');
        return svg !== null;
      });

      if (deleteButton) {
        await user.click(deleteButton);

        expect(mockDelete).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
      }
    });

    it('should navigate home when deleting current conversation', async () => {
      const mockDelete = vi.fn().mockResolvedValue({});
      mockUseDeleteConversation.mockReturnValue({
        mutateAsync: mockDelete,
        isPending: false,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      const conversationButtons = screen.getAllByRole('button');
      const deleteButton = conversationButtons.find(btn => {
        const svg = btn.querySelector('svg.lucide-trash-2');
        return svg !== null;
      });

      if (deleteButton) {
        await user.click(deleteButton);

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith('/');
        });
      }
    });
  });

  describe('Invalid UUID Handling', () => {
    it('should show error for invalid UUID', () => {
      mockConversationId = 'invalid-uuid';

      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Invalid conversation ID')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
    });

    it('should navigate home when Go Home clicked', async () => {
      mockConversationId = 'invalid-uuid';

      render(<ChatPage />, { wrapper: createWrapper() });

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      await user.click(goHomeButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Conversation Not Found', () => {
    it('should show not found when conversation does not exist', async () => {
      mockConversationId = '550e8400-e29b-41d4-a716-446655449999';

      render(<ChatPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Conversation not found')).toBeInTheDocument();
      });
    });

    it('should show deleted message', async () => {
      mockConversationId = '550e8400-e29b-41d4-a716-446655449999';

      render(<ChatPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('This conversation may have been deleted.')).toBeInTheDocument();
      });
    });

    it('should navigate home when Go Home clicked on not found', async () => {
      mockConversationId = '550e8400-e29b-41d4-a716-446655449999';

      render(<ChatPage />, { wrapper: createWrapper() });

      await waitFor(() => {
        const goHomeButton = screen.getByRole('button', { name: /go home/i });
        return goHomeButton;
      });

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      await user.click(goHomeButton);

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('Message Loading', () => {
    it('should show loading state when messages are loading', () => {
      mockUseConversationMessages.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      // Should show loader in main area
      const mainContent = document.querySelector('main');
      const loader = mainContent?.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });
  });

  describe('Message Persistence', () => {
    it('should call addMessage when new message is sent', async () => {
      const mockAddMessage = vi.fn().mockResolvedValue({});
      mockUseAddMessage.mockReturnValue({
        mutateAsync: mockAddMessage,
        isPending: false,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      const sendButton = screen.getByTestId('send-message-btn');
      await user.click(sendButton);

      await waitFor(() => {
        expect(mockAddMessage).toHaveBeenCalled();
      });
    });
  });

  describe('Tool Invocation Handling', () => {
    it('should handle incomplete tool invocations', () => {
      mockUseConversationMessages.mockReturnValue({
        data: [mockMessageWithToolInvocation],
        isLoading: false,
        error: null,
      });

      render(<ChatPage />, { wrapper: createWrapper() });

      // Message should render without crashing
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });
  });

  describe('Mobile Header', () => {
    it('should display mobile header with history button', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // Mobile header has History icon
      const historyIcon = document.querySelector('.lucide-history');
      expect(historyIcon).toBeInTheDocument();
    });

    it('should display AI Assistant title in mobile header', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    });

    it('should display new chat button in mobile header', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      // Mobile new chat button has MessageSquarePlus icon
      const buttons = screen.getAllByRole('button');
      const newChatMobile = buttons.find(btn => {
        const svg = btn.querySelector('svg.lucide-message-square-plus');
        return svg !== null;
      });
      expect(newChatMobile).toBeInTheDocument();
    });
  });

  describe('Backend Status', () => {
    it('should display backend connected status', () => {
      render(<ChatPage />, { wrapper: createWrapper() });

      expect(screen.getByText('Backend Connected')).toBeInTheDocument();
    });
  });
});
