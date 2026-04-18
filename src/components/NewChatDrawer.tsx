import { useEffect, useState } from 'react';
import { X, Search, MessageCirclePlus, Users } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { useUserSearch } from '@/hooks/useUserSearch';

type Profile = Tables<'profiles'>;

interface NewChatDrawerProps {
  open: boolean;
  currentUserId: string;
  onClose: () => void;
  onPick: (profile: Profile) => void;
}

export function NewChatDrawer({ open, currentUserId, onClose, onPick }: NewChatDrawerProps) {
  const [query, setQuery] = useState('');
  const { results, loading } = useUserSearch(currentUserId, query);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-background/80 backdrop-blur-sm p-4 sm:p-8 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-md rounded-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-glass-border">
          <div className="flex items-center gap-2">
            <MessageCirclePlus className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Start a new chat</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto pb-2">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Type a name to find people</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-8">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-primary rounded-full animate-typing" />
                <span className="w-2 h-2 bg-primary rounded-full animate-typing" style={{ animationDelay: '0.2s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-typing" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No one found
            </div>
          ) : (
            results.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onPick(p)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-all animate-fade-in"
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div
                  className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center ring-1 ring-border shrink-0"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.72 0.19 ${(p.display_name.charCodeAt(0) * 15) % 360}), oklch(0.5 0.15 ${(p.display_name.charCodeAt(0) * 15 + 60) % 360}))`,
                  }}
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-base font-bold text-foreground">
                      {p.display_name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {p.display_name}
                  </p>
                  {p.bio && (
                    <p className="text-xs text-muted-foreground truncate">{p.bio}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
