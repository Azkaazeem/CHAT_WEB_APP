import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type UserBlock = Tables<'user_blocks'>;
type BlockEvent = Tables<'block_events'>;

/**
 * Tracks who the current user has blocked, and who has blocked them.
 * Also exposes the block-event history for showing block/unblock dates.
 */
export function useBlocks(currentUserId: string | undefined) {
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [events, setEvents] = useState<BlockEvent[]>([]);

  const refresh = useCallback(async () => {
    if (!currentUserId) return;
    const [{ data: b }, { data: e }] = await Promise.all([
      supabase
        .from('user_blocks')
        .select('*')
        .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`),
      supabase
        .from('block_events')
        .select('*')
        .or(`actor_id.eq.${currentUserId},target_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false }),
    ]);
    setBlocks(b ?? []);
    setEvents(e ?? []);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    refresh();

    const channel = supabase
      .channel(`blocks-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_blocks' },
        () => refresh(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'block_events' },
        () => refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, refresh]);

  const iBlocked = (otherId: string) =>
    blocks.find((b) => b.blocker_id === currentUserId && b.blocked_id === otherId);

  const blockedMe = (otherId: string) =>
    blocks.find((b) => b.blocker_id === otherId && b.blocked_id === currentUserId);

  const isBlockedEitherWay = (otherId: string) =>
    Boolean(iBlocked(otherId) || blockedMe(otherId));

  const block = async (otherId: string) => {
    if (!currentUserId) return;
    await supabase
      .from('user_blocks')
      .insert({ blocker_id: currentUserId, blocked_id: otherId });
    await supabase
      .from('block_events')
      .insert({ actor_id: currentUserId, target_id: otherId, action: 'block' });
  };

  const unblock = async (otherId: string) => {
    if (!currentUserId) return;
    await supabase
      .from('user_blocks')
      .delete()
      .eq('blocker_id', currentUserId)
      .eq('blocked_id', otherId);
    await supabase
      .from('block_events')
      .insert({ actor_id: currentUserId, target_id: otherId, action: 'unblock' });
  };

  /** Return events visible to both users for a given pair. */
  const eventsBetween = (otherId: string) =>
    events
      .filter(
        (e) =>
          (e.actor_id === currentUserId && e.target_id === otherId) ||
          (e.actor_id === otherId && e.target_id === currentUserId),
      )
      .sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

  return {
    blocks,
    events,
    iBlocked,
    blockedMe,
    isBlockedEitherWay,
    block,
    unblock,
    eventsBetween,
  };
}
