import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Message = Tables<'messages'>;

export interface AttachmentInput {
  url: string;
  type: string;
  kind: 'image' | 'video' | 'audio' | 'file';
  name: string;
  size: number;
}

export function useMessages(
  currentUserId: string | undefined,
  otherUserId: string | undefined,
  clearedAt?: string | null,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    setLoading(true);
    const fetchMessages = async () => {
      let query = supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
        )
        .order('created_at', { ascending: true });

      if (clearedAt) query = query.gt('created_at', clearedAt);

      const { data } = await query;
      if (data) setMessages(data);
      setLoading(false);

      // Mark unread messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`messages-${currentUserId}-${otherUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message;
          const isRelevant =
            (msg.sender_id === currentUserId && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === currentUserId);
          if (!isRelevant) return;
          if (clearedAt && new Date(msg.created_at) <= new Date(clearedAt)) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          if (msg.receiver_id === currentUserId) {
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m)));
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        (payload) => {
          const old = payload.old as Message;
          setMessages((prev) => prev.filter((m) => m.id !== old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId, clearedAt]);

  const sendMessage = useCallback(
    async (content: string, attachment?: AttachmentInput) => {
      if (!currentUserId || !otherUserId) return;
      if (!content.trim() && !attachment) return;

      const payload: any = {
        sender_id: currentUserId,
        receiver_id: otherUserId,
        content: content.trim(),
      };

      if (attachment) {
        payload.attachment_url = attachment.url;
        payload.attachment_type = attachment.type;
        payload.attachment_kind = attachment.kind;
        payload.attachment_name = attachment.name;
        payload.attachment_size = attachment.size;
      }

      const { error } = await supabase.from('messages').insert(payload);
      return { error };
    },
    [currentUserId, otherUserId],
  );

  const editMessage = useCallback(async (id: string, content: string) => {
    await supabase
      .from('messages')
      .update({ content: content.trim(), edited_at: new Date().toISOString() })
      .eq('id', id);
  }, []);

  const deleteMessage = useCallback(async (id: string) => {
    await supabase.from('messages').delete().eq('id', id);
  }, []);

  return { messages, loading, sendMessage, editMessage, deleteMessage };
}

export function useUnreadCounts(currentUserId: string | undefined) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!currentUserId) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('receiver_id', currentUserId)
        .eq('is_read', false);

      if (data) {
        const map: Record<string, number> = {};
        data.forEach((m) => {
          map[m.sender_id] = (map[m.sender_id] || 0) + 1;
        });
        setCounts(map);
      }
    };

    fetch();

    const channel = supabase
      .channel(`unread-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        () => {
          fetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return counts;
}
