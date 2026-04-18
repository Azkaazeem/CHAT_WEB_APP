import { useState } from 'react';
import {
  MessageSquarePlus,
  MessageCircle,
  MoreVertical,
  Pin,
  Trash2,
  Eraser,
  Ban,
  CheckCircle2,
  PinOff,
  Image as ImageIcon,
  Video,
  Paperclip,
  Mic,
} from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import type { ChatItem } from '@/hooks/useConversations';
import { useClickOutside } from '@/hooks/useClickOutside';

type Profile = Tables<'profiles'>;

interface ChatListProps {
  items: ChatItem[];
  selectedUserId?: string;
  unreadCounts: Record<string, number>;
  onlineIds: Set<string>;
  currentUserProfile: Profile | null;
  onSelect: (item: ChatItem) => void;
  onOpenProfile: () => void;
  onAvatarOpen: (url: string, name: string) => void;
  onNewChat: () => void;
  onPinToggle: (item: ChatItem) => void;
  onClearChat: (item: ChatItem) => void;
  onDeleteChat: (item: ChatItem) => void;
  onBlockToggle: (item: ChatItem) => void;
  isBlockedByMe: (otherId: string) => boolean;
}

export function ChatList({
  items,
  selectedUserId,
  unreadCounts,
  onlineIds,
  currentUserProfile,
  onSelect,
  onOpenProfile,
  onAvatarOpen,
  onNewChat,
  onPinToggle,
  onClearChat,
  onDeleteChat,
  onBlockToggle,
  isBlockedByMe,
}: ChatListProps) {
  return (
    <div className="h-full flex flex-col bg-surface">
      {/* Header */}
      <div className="p-4 border-b border-border animate-fade-in-down">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-text">ChatFlow</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              aria-label="Start new chat"
              className="w-9 h-9 rounded-full bg-primary/15 hover:bg-primary/25 text-primary flex items-center justify-center transition-all hover:scale-110"
            >
              <MessageSquarePlus className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => {
                if (currentUserProfile?.avatar_url) {
                  onAvatarOpen(currentUserProfile.avatar_url, currentUserProfile.display_name);
                } else {
                  onOpenProfile();
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                onOpenProfile();
              }}
              className="relative group"
              aria-label="My profile"
            >
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                {currentUserProfile?.avatar_url ? (
                  <img
                    src={currentUserProfile.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {(currentUserProfile?.display_name || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3 animate-float">
              <MessageCircle className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No chats yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Tap the new chat button to find someone
            </p>
            <button
              onClick={onNewChat}
              className="bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90 transition-all hover-lift inline-flex items-center gap-2"
            >
              <MessageSquarePlus className="w-4 h-4" />
              New chat
            </button>
          </div>
        ) : (
          items.map((item, i) => (
            <ChatRow
              key={item.conversation.id}
              item={item}
              index={i}
              isSelected={item.otherUser.user_id === selectedUserId}
              isOnline={onlineIds.has(item.otherUser.user_id)}
              unread={unreadCounts[item.otherUser.user_id] || 0}
              isBlockedByMe={isBlockedByMe(item.otherUser.user_id)}
              onSelect={() => onSelect(item)}
              onAvatarOpen={onAvatarOpen}
              onPinToggle={() => onPinToggle(item)}
              onClearChat={() => onClearChat(item)}
              onDeleteChat={() => onDeleteChat(item)}
              onBlockToggle={() => onBlockToggle(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ChatRowProps {
  item: ChatItem;
  index: number;
  isSelected: boolean;
  isOnline: boolean;
  unread: number;
  isBlockedByMe: boolean;
  onSelect: () => void;
  onAvatarOpen: (url: string, name: string) => void;
  onPinToggle: () => void;
  onClearChat: () => void;
  onDeleteChat: () => void;
  onBlockToggle: () => void;
}

function ChatRow({
  item,
  index,
  isSelected,
  isOnline,
  unread,
  isBlockedByMe,
  onSelect,
  onAvatarOpen,
  onPinToggle,
  onClearChat,
  onDeleteChat,
  onBlockToggle,
}: ChatRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false), menuOpen);
  const profile = item.otherUser;

  const last = item.lastMessage;
  const previewIcon = last?.attachment_kind === 'image' ? (
    <ImageIcon className="w-3 h-3" />
  ) : last?.attachment_kind === 'video' ? (
    <Video className="w-3 h-3" />
  ) : last?.attachment_kind === 'audio' ? (
    <Mic className="w-3 h-3" />
  ) : last?.attachment_kind === 'file' ? (
    <Paperclip className="w-3 h-3" />
  ) : null;

  const previewText = last
    ? last.content?.trim()
      ? last.content
      : last.attachment_kind === 'image'
        ? 'Photo'
        : last.attachment_kind === 'video'
          ? 'Video'
          : last.attachment_kind === 'audio'
            ? 'Voice message'
            : last.attachment_kind === 'file'
              ? last.attachment_name || 'File'
              : ''
    : 'Say hello!';

  const timeText = last
    ? formatChatTime(last.created_at)
    : '';

  return (
    <div
      className={`group relative flex items-center gap-3 px-4 py-3 transition-all duration-200 animate-slide-in-left hover:bg-surface-hover ${
        isSelected ? 'bg-primary/10 border-r-2 border-primary' : ''
      }`}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <button onClick={onSelect} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (profile.avatar_url) onAvatarOpen(profile.avatar_url, profile.display_name);
              else onSelect();
            }}
            className="block"
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden ${
                isSelected ? 'ring-2 ring-primary' : 'ring-1 ring-border'
              } transition-all hover:scale-105`}
              style={{
                background: `linear-gradient(135deg, oklch(0.72 0.19 ${(profile.display_name.charCodeAt(0) * 15) % 360}), oklch(0.5 0.15 ${(profile.display_name.charCodeAt(0) * 15 + 60) % 360}))`,
              }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-foreground">
                  {profile.display_name[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
          </button>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-online rounded-full border-2 border-surface animate-pulse-glow pointer-events-none" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`font-semibold text-sm truncate ${
                isSelected ? 'text-primary' : 'text-foreground'
              }`}
            >
              {profile.display_name}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              {item.isPinned && <Pin className="w-3 h-3 text-primary fill-primary" />}
              {timeText && (
                <span className="text-[10px] text-muted-foreground">{timeText}</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              {previewIcon}
              <span className="truncate">{previewText}</span>
            </p>
            {unread > 0 && (
              <span className="shrink-0 min-w-[1.25rem] h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1.5 animate-bounce-in">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* 3-dot menu */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
          aria-label="Chat options"
          className="w-8 h-8 rounded-full hover:bg-background/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100 data-[open=true]:opacity-100"
          data-open={menuOpen}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-9 z-30 w-12 glass-panel rounded-xl shadow-2xl py-1 animate-scale-in origin-top-right flex flex-col items-center gap-0.5">
            <MenuButton
              label={item.isPinned ? 'Unpin' : 'Pin'}
              onClick={() => {
                onPinToggle();
                setMenuOpen(false);
              }}
            >
              {item.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </MenuButton>
            <MenuButton
              label="Clear chat"
              onClick={() => {
                onClearChat();
                setMenuOpen(false);
              }}
            >
              <Eraser className="w-4 h-4" />
            </MenuButton>
            <MenuButton
              label={isBlockedByMe ? 'Unblock' : 'Block'}
              danger={!isBlockedByMe}
              onClick={() => {
                onBlockToggle();
                setMenuOpen(false);
              }}
            >
              {isBlockedByMe ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
            </MenuButton>
            <MenuButton
              label="Delete chat"
              danger
              onClick={() => {
                onDeleteChat();
                setMenuOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </MenuButton>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuButton({
  children,
  label,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
        danger
          ? 'text-destructive hover:bg-destructive/15'
          : 'text-foreground hover:bg-surface-hover'
      }`}
    >
      {children}
    </button>
  );
}

function formatChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}
