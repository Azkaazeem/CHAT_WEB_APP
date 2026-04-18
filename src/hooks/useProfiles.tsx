import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

export function useProfiles(currentUserId: string | undefined) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchProfiles = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', currentUserId)
        .order('display_name');
      
      if (data) setProfiles(data);
      setLoading(false);
    };

    fetchProfiles();

    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setProfiles(prev => prev.map(p => p.id === (payload.new as Profile).id ? payload.new as Profile : p));
        } else if (payload.eventType === 'INSERT' && (payload.new as Profile).user_id !== currentUserId) {
          setProfiles(prev => [...prev, payload.new as Profile]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  return { profiles, loading };
}

export function useMyProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) setProfile(data);
      setLoading(false);
    };

    fetch();
  }, [userId]);

  const updateProfile = async (updates: Partial<Pick<Profile, 'display_name' | 'bio' | 'avatar_url'>>) => {
    if (!userId) return;
    const { data } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (data) setProfile(data);
    return data;
  };

  return { profile, loading, updateProfile };
}
