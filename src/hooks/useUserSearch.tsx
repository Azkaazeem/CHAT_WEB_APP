import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

/**
 * Search all profiles (excluding the current user) by display name.
 * Returns at most 20 matches; empty query returns [].
 */
export function useUserSearch(currentUserId: string | undefined, query: string) {
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }

    let active = true;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', currentUserId)
        .ilike('display_name', `%${q}%`)
        .order('display_name')
        .limit(20);
      if (active) {
        setResults(data ?? []);
        setLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [currentUserId, query]);

  return { results, loading };
}
