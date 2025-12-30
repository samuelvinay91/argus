'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { ChatConversation, ChatMessage, InsertTables } from '@/lib/supabase/types';

export function useConversations(projectId?: string | null) {
  const { user } = useUser();
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['conversations', user?.id, projectId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ChatConversation[];
    },
    enabled: !!user?.id,
  });
}

export function useConversation(conversationId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (error) throw error;
      return data as ChatConversation;
    },
    enabled: !!conversationId,
  });
}

export function useConversationMessages(conversationId: string | null) {
  const supabase = getSupabaseClient();

  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!conversationId,
  });
}

export function useCreateConversation() {
  const { user } = useUser();
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { projectId?: string; title?: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const insertData = {
        user_id: user.id,
        project_id: data.projectId || null,
        title: data.title || 'New Conversation',
      };

      console.log('Creating conversation with:', insertData);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: conversation, error } = await (supabase.from('chat_conversations') as any)
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      return conversation as ChatConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useAddMessage() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: InsertTables<'chat_messages'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('chat_messages') as any)
        .insert(message)
        .select()
        .single();

      if (error) throw error;
      return data as ChatMessage;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversation-messages', data.conversation_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useDeleteConversation() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversationId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('chat_conversations') as any)
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

export function useUpdateConversation() {
  const supabase = getSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ChatConversation>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('chat_conversations') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ChatConversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['conversation', data.id] });
    },
  });
}
