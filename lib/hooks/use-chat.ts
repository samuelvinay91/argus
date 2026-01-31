'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import {
  conversationsApi,
  Conversation,
  ChatMessageApi,
  CreateConversationRequest,
  CreateMessageRequest,
  UpdateConversationRequest,
} from '@/lib/api-client';
import type { ChatConversation, ChatMessage, Json } from '@/lib/supabase/types';

// ============================================================================
// Transform Functions (API -> Legacy Types)
// ============================================================================

/**
 * Transform API Conversation to legacy ChatConversation type
 * Maintains backward compatibility with existing components
 */
function transformConversation(conversation: Conversation): ChatConversation {
  return {
    id: conversation.id,
    project_id: conversation.projectId,
    user_id: conversation.userId,
    title: conversation.title,
    preview: conversation.preview,
    message_count: conversation.messageCount,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  };
}

/**
 * Transform API Message to legacy ChatMessage type
 * Maintains backward compatibility with existing components
 */
function transformMessage(message: ChatMessageApi): ChatMessage {
  return {
    id: message.id,
    conversation_id: message.conversationId,
    role: message.role,
    content: message.content,
    tool_invocations: message.toolInvocations as Json | null,
    created_at: message.createdAt,
  };
}

// ============================================================================
// Hooks
// ============================================================================

export function useConversations(projectId?: string | null) {
  const { user } = useUser();

  return useQuery({
    queryKey: ['conversations', user?.id, projectId],
    queryFn: async () => {
      if (!user?.id) return [];

      const response = await conversationsApi.list({
        projectId: projectId || undefined,
        limit: 50,
      });

      return response.conversations.map(transformConversation);
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 seconds - conversations update frequently
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    placeholderData: [], // Prevent loading state flash
  });
}

export function useConversation(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const conversation = await conversationsApi.get(conversationId);
      return transformConversation(conversation);
    },
    enabled: !!conversationId,
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const response = await conversationsApi.getMessages(conversationId, {
        limit: 100,
      });

      return response.messages.map(transformMessage);
    },
    enabled: !!conversationId,
    staleTime: 10 * 1000, // 10 seconds - messages update during chat
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    placeholderData: [], // Prevent loading state flash
  });
}

export function useCreateConversation() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { projectId?: string; title?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const request: CreateConversationRequest = {
        projectId: data.projectId || null,
        title: data.title || 'New Conversation',
      };

      console.log('Creating conversation with:', request);

      const conversation = await conversationsApi.create(request);
      return transformConversation(conversation);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useAddMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      conversation_id: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      tool_invocations?: Record<string, unknown> | null;
    }) => {
      // Validate conversation_id is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!message.conversation_id || !uuidRegex.test(message.conversation_id)) {
        throw new Error(`Invalid conversation_id: ${message.conversation_id}. Must be a valid UUID.`);
      }

      console.log('Adding message to conversation:', {
        conversation_id: message.conversation_id,
        role: message.role,
        content_length: message.content?.length || 0
      });

      const request: CreateMessageRequest = {
        role: message.role,
        content: message.content,
        toolInvocations: message.tool_invocations,
      };

      const newMessage = await conversationsApi.addMessage(message.conversation_id, request);

      console.log('Message added successfully:', newMessage.id);
      return transformMessage(newMessage);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      await conversationsApi.delete(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ChatConversation>) => {
      // Transform legacy updates to API format
      const request: UpdateConversationRequest = {};
      if (updates.title !== undefined) request.title = updates.title;
      if (updates.preview !== undefined) request.preview = updates.preview;

      const conversation = await conversationsApi.update(id, request);
      return transformConversation(conversation);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', data.id] });
    },
  });
}
