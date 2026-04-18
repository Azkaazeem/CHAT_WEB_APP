import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Real-time presence using Supabase channels.
 * Returns a Set of user IDs currently online.
 * Each connected client tracks itself; others receive presence sync events.
 */
export function usePresence(currentUserId: string | undefined) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase.channel('online-users', {
      config: { presence: { key: currentUserId } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return onlineIds;
}
