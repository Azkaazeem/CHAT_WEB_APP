import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Conversation = Tables<'conversations'>;
type Profile = Tables<'profiles'>;
type Message = Tables<'messages'>;

export interface ChatItem {
  conversation: Conversation;
  otherUser: Profile;
  lastMessage: Message | null;
  unreadCount: number;
  isPinned: boolean;
  clearedAt: string | null;
}

/**
 * Fetches the user's chat list (only conversations they've engaged with).
 * Hides chats marked hidden by the current user.
 */
export function useConversations(currentUserId: string | undefined) {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!currentUserId) return;

    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .or(`user_a.eq.${currentUserId},user_b.eq.${currentUserId}`);

    if (!convs || convs.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    // Filter out conversations hidden by current user
    const visible = convs.filter((c) =>
      c.user_a === currentUserId ? !c.hidden_by_a : !c.hidden_by_b,
    );

    const otherIds = visible.map((c) =>
      c.user_a === currentUserId ? c.user_b : c.user_a,
    );

    if (otherIds.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('user_id', otherIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

    // Get last message + unread per conversation
    const result: ChatItem[] = await Promise.all(
      visible.map(async (c) => {
        const otherId = c.user_a === currentUserId ? c.user_b : c.user_a;
        const clearedAt = c.user_a === currentUserId ? c.cleared_at_a : c.cleared_at_b;
        const isPinned = c.user_a === currentUserId ? c.pinned_by_a : c.pinned_by_b;

        let msgQuery = supabase
          .from('messages')
          .select('*')
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUserId})`,
          )
          .order('created_at', { ascending: false })
          .limit(1);

        if (clearedAt) msgQuery = msgQuery.gt('created_at', clearedAt);

        const { data: lastMsgs } = await msgQuery;

        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', otherId)
          .eq('receiver_id', currentUserId)
          .eq('is_read', false);

        return {
          conversation: c,
          otherUser: profileMap.get(otherId) as Profile,
          lastMessage: lastMsgs?.[0] ?? null,
          unreadCount: count ?? 0,
          isPinned,
          clearedAt,
        };
      }),
    );

    // Filter out items where other user no longer has profile
    const clean = result.filter((r) => r.otherUser);

    // Sort: pinned first, then by last message time / conversation updated_at
    clean.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const aTime = a.lastMessage?.created_at ?? a.conversation.updated_at;
      const bTime = b.lastMessage?.created_at ?? b.conversation.updated_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    setItems(clean);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    refresh();

    const channel = supabase
      .channel(`chats-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refresh]);

  return { items, loading, refresh };
}

/**
 * Helpers for managing a single conversation row.
 */
export async function ensureConversation(userA: string, userB: string) {
  const [a, b] = userA < userB ? [userA, userB] : [userB, userA];
  const { data } = await supabase
    .from('conversations')
    .upsert({ user_a: a, user_b: b }, { onConflict: 'user_a,user_b' })
    .select()
    .single();
  return data;
}

export async function setPinned(
  conversationId: string,
  isUserA: boolean,
  pinned: boolean,
) {
  const update = isUserA ? { pinned_by_a: pinned } : { pinned_by_b: pinned };
  await supabase.from('conversations').update(update).eq('id', conversationId);
}

export async function clearChat(
  conversationId: string,
  isUserA: boolean,
) {
  const now = new Date().toISOString();
  const update = isUserA ? { cleared_at_a: now } : { cleared_at_b: now };
  await supabase.from('conversations').update(update).eq('id', conversationId);
}

export async function hideChat(conversationId: string, isUserA: boolean) {
  const now = new Date().toISOString();
  const update = isUserA
    ? { hidden_by_a: true, cleared_at_a: now }
    : { hidden_by_b: true, cleared_at_b: now };
  await supabase.from('conversations').update(update).eq('id', conversationId);
}
