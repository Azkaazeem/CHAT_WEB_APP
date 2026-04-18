import { Search, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface UserListProps {
  profiles: Profile[];
  selectedUserId?: string;
  unreadCounts: Record<string, number>;
  onSelectUser: (profile: Profile) => void;
  currentUserProfile: Profile | null;
  onOpenProfile: () => void;
}

export function UserList({ profiles, selectedUserId, unreadCounts, onSelectUser, currentUserProfile, onOpenProfile }: UserListProps) {
  const [search, setSearch] = useState('');

  const filtered = profiles.filter(p =>
    p.display_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-border animate-fade-in-down">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold gradient-text">ChatFlow</h1>
          <button
            onClick={onOpenProfile}
            className="relative group"
          >
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
              {currentUserProfile?.avatar_url ? (
                <img src={currentUserProfile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-primary">
                  {(currentUserProfile?.display_name || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Users */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <MessageCircle className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No users found</p>
          </div>
        ) : (
          filtered.map((profile, i) => {
            const isSelected = profile.user_id === selectedUserId;
            const unread = unreadCounts[profile.user_id] || 0;

            return (
              <button
                key={profile.id}
                onClick={() => onSelectUser(profile)}
                className={`w-full flex items-center gap-3 p-4 transition-all duration-200 animate-slide-in-left hover:bg-surface-hover ${
                  isSelected ? 'bg-primary/10 border-r-2 border-primary' : ''
                }`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                    isSelected ? 'ring-2 ring-primary' : 'ring-1 ring-border'
                  } transition-all`}
                    style={{ background: `linear-gradient(135deg, oklch(0.72 0.19 ${(profile.display_name.charCodeAt(0) * 15) % 360}), oklch(0.5 0.15 ${(profile.display_name.charCodeAt(0) * 15 + 60) % 360}))` }}
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-foreground">
                        {profile.display_name[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  {profile.is_online && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-online rounded-full border-2 border-surface animate-pulse-glow" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 text-left">
                  <p className={`font-semibold text-sm truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                    {profile.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {profile.bio || 'Hey there! I am using ChatFlow'}
                  </p>
                </div>

                {/* Unread badge */}
                {unread > 0 && (
                  <span className="shrink-0 min-w-[1.25rem] h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center px-1.5 animate-bounce-in">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
