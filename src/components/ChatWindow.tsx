import { useState, useRef, useEffect } from 'react';
import {
  Send,
  ArrowLeft,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Video,
  X,
  Pencil,
  Trash2,
  MoreVertical,
  Check,
  Download,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import type { Tables } from '@/integrations/supabase/types';
import { useMessages, type AttachmentInput } from '@/hooks/useMessages';
import { useClickOutside } from '@/hooks/useClickOutside';
import { uploadChatAttachment, formatBytes, detectKind } from '@/lib/attachments';
import { Alert, Toast } from '@/lib/alert';

type Profile = Tables<'profiles'>;
type Message = Tables<'messages'>;

interface ChatWindowProps {
  currentUserId: string;
  otherUser: Profile;
  isOnline: boolean;
  clearedAt: string | null;
  iBlocked: boolean;
  blockedMe: boolean;
  blockEvents: { action: string; created_at: string; actor_id: string }[];
  onBack: () => void;
  onAvatarOpen: (url: string, name: string) => void;
  onUnblock: () => void;
}

export function ChatWindow({
  currentUserId,
  otherUser,
  isOnline,
  clearedAt,
  iBlocked,
  blockedMe,
  blockEvents,
  onBack,
  onAvatarOpen,
  onUnblock,
}: ChatWindowProps) {
  const { messages, loading, sendMessage, editMessage, deleteMessage } = useMessages(
    currentUserId,
    otherUser.user_id,
    clearedAt,
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const emojiRef = useClickOutside<HTMLDivElement>(() => setEmojiOpen(false), emojiOpen);

  const isBlocked = iBlocked || blockedMe;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    setEditingId(null);
    setEmojiOpen(false);
    setPendingFile(null);
    setInput('');
  }, [otherUser.user_id]);

  const handleSend = async () => {
    if (sending || isBlocked) return;
    const text = input;
    if (!text.trim() && !pendingFile) return;

    setSending(true);
    let attachment: AttachmentInput | undefined;

    try {
      if (pendingFile) {
        setUploadProgress(true);
        const up = await uploadChatAttachment(currentUserId, pendingFile);
        attachment = {
          url: up.url,
          type: up.type,
          kind: up.kind,
          name: up.name,
          size: up.size,
        };
        setUploadProgress(false);
      }

      const result = await sendMessage(text, attachment);
      if (result?.error) {
        Toast.fire({ icon: 'error', title: 'Could not send message' });
      } else {
        setInput('');
        setPendingFile(null);
      }
    } catch (e: any) {
      Toast.fire({ icon: 'error', title: e?.message || 'Upload failed' });
    } finally {
      setSending(false);
      setUploadProgress(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const max = 25 * 1024 * 1024; // 25 MB cap
    if (file.size > max) {
      Toast.fire({ icon: 'error', title: 'File too large (max 25 MB)' });
      return;
    }
    setPendingFile(file);
  };

  const handleEditStart = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.content || '');
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) {
      Toast.fire({ icon: 'warning', title: 'Message cannot be empty' });
      return;
    }
    await editMessage(editingId, text);
    setEditingId(null);
  };

  const handleDelete = async (msg: Message) => {
    const result = await Alert.fire({
      title: 'Delete this message?',
      text: 'This will remove it for everyone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
    });
    if (result.isConfirmed) {
      await deleteMessage(msg.id);
      Toast.fire({ icon: 'success', title: 'Message deleted' });
    }
  };

  // Build a combined timeline that interleaves messages with block/unblock notices
  const timeline = buildTimeline(messages, blockEvents, otherUser.display_name);

  return (
    <div className="h-full flex flex-col bg-background">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFilePick} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleFilePick} />

      {/* Header */}
      <div className="glass-panel border-b border-glass-border p-4 flex items-center gap-3 animate-fade-in-down">
        <button
          onClick={onBack}
          aria-label="Back"
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() =>
            otherUser.avatar_url && onAvatarOpen(otherUser.avatar_url, otherUser.display_name)
          }
          className="relative shrink-0 hover:scale-105 transition-transform"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ring-1 ring-border"
            style={{
              background: `linear-gradient(135deg, oklch(0.72 0.19 ${(otherUser.display_name.charCodeAt(0) * 15) % 360}), oklch(0.5 0.15 ${(otherUser.display_name.charCodeAt(0) * 15 + 60) % 360}))`,
            }}
          >
            {otherUser.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-bold text-foreground">
                {otherUser.display_name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-online rounded-full border-2 border-background" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {otherUser.display_name}
          </p>
          <p className="text-xs text-muted-foreground">{isOnline ? 'Online' : 'Offline'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 bg-primary/40 rounded-full animate-typing" />
              <span className="w-3 h-3 bg-primary/40 rounded-full animate-typing" style={{ animationDelay: '0.2s' }} />
              <span className="w-3 h-3 bg-primary/40 rounded-full animate-typing" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        ) : timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
              <Smile className="w-8 h-8 text-primary/50" />
            </div>
            <p className="text-muted-foreground text-sm">No messages yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Say hello to {otherUser.display_name}!
            </p>
          </div>
        ) : (
          timeline.map((entry, i) => {
            if (entry.kind === 'date') {
              return (
                <div key={`d-${i}`} className="flex justify-center my-4">
                  <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full animate-fade-in">
                    {entry.label}
                  </span>
                </div>
              );
            }
            if (entry.kind === 'system') {
              return (
                <div key={`s-${i}`} className="flex justify-center my-2">
                  <span className="bg-surface text-muted-foreground text-[11px] px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 animate-fade-in border border-border">
                    {entry.icon}
                    {entry.label}
                  </span>
                </div>
              );
            }
            const msg = entry.message;
            const isSent = msg.sender_id === currentUserId;
            const isEditing = editingId === msg.id;
            return (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isSent={isSent}
                isEditing={isEditing}
                editText={editText}
                setEditText={setEditText}
                onEditStart={() => handleEditStart(msg)}
                onEditSave={handleEditSave}
                onEditCancel={() => setEditingId(null)}
                onDelete={() => handleDelete(msg)}
                onImageOpen={(url) => onAvatarOpen(url, otherUser.display_name)}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Block banners */}
      {blockedMe && (
        <div className="px-4 py-3 border-t border-glass-border bg-destructive/10 text-destructive text-xs flex items-center gap-2 animate-fade-in-up">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{otherUser.display_name} has blocked you. You can't send messages.</span>
        </div>
      )}
      {iBlocked && !blockedMe && (
        <div className="px-4 py-3 border-t border-glass-border bg-surface text-muted-foreground text-xs flex items-center justify-between gap-2 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Ban className="w-4 h-4 text-destructive shrink-0" />
            <span>You've blocked this person.</span>
          </div>
          <button
            onClick={onUnblock}
            className="text-primary font-semibold hover:underline"
          >
            Unblock
          </button>
        </div>
      )}

      {/* Pending attachment preview */}
      {pendingFile && !isBlocked && (
        <div className="px-4 pt-3 animate-fade-in-up">
          <div className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
              {detectKind(pendingFile) === 'image' ? (
                <ImageIcon className="w-5 h-5" />
              ) : detectKind(pendingFile) === 'video' ? (
                <Video className="w-5 h-5" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{pendingFile.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(pendingFile.size)}</p>
            </div>
            <button
              onClick={() => setPendingFile(null)}
              className="w-8 h-8 rounded-full hover:bg-background/60 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
              aria-label="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      {!isBlocked && (
        <div className="glass-panel border-t border-glass-border p-3 sm:p-4 animate-slide-in-up relative">
          {emojiOpen && (
            <div ref={emojiRef} className="absolute bottom-full left-2 mb-2 z-20 animate-scale-in origin-bottom-left">
              <EmojiPicker
                theme={Theme.DARK}
                onEmojiClick={(e) => {
                  setInput((prev) => prev + e.emoji);
                  inputRef.current?.focus();
                }}
                width={320}
                height={380}
              />
            </div>
          )}

          <div className="flex items-end gap-2">
            <button
              onClick={() => setEmojiOpen((v) => !v)}
              className="w-10 h-10 rounded-full hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0"
              aria-label="Emoji"
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              onClick={() => imageInputRef.current?.click()}
              className="w-10 h-10 rounded-full hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0"
              aria-label="Send image"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => videoInputRef.current?.click()}
              className="w-10 h-10 rounded-full hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0"
              aria-label="Send video"
            >
              <Video className="w-5 h-5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-primary transition-all shrink-0"
              aria-label="Send file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none max-h-32"
            />

            <button
              onClick={handleSend}
              disabled={(!input.trim() && !pendingFile) || sending}
              className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-all disabled:opacity-30 hover-lift shrink-0"
              aria-label="Send"
            >
              {uploadProgress ? (
                <div className="flex gap-0.5">
                  <span className="w-1 h-1 bg-primary-foreground rounded-full animate-typing" />
                  <span className="w-1 h-1 bg-primary-foreground rounded-full animate-typing" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-1 bg-primary-foreground rounded-full animate-typing" style={{ animationDelay: '0.4s' }} />
                </div>
              ) : (
                <Send className="w-4.5 h-4.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  msg: Message;
  isSent: boolean;
  isEditing: boolean;
  editText: string;
  setEditText: (s: string) => void;
  onEditStart: () => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
  onImageOpen: (url: string) => void;
}

function MessageBubble({
  msg,
  isSent,
  isEditing,
  editText,
  setEditText,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
  onImageOpen,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside<HTMLDivElement>(() => setMenuOpen(false), menuOpen);

  return (
    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-message-in group`}>
      <div className={`relative max-w-[78%] flex items-start gap-1 ${isSent ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className={`px-3 py-2 text-sm leading-relaxed ${
            isSent
              ? 'bg-chat-bubble-sent text-chat-bubble-sent-foreground rounded-2xl rounded-br-md'
              : 'bg-chat-bubble-received text-chat-bubble-received-foreground rounded-2xl rounded-bl-md'
          }`}
        >
          {/* Attachment */}
          {msg.attachment_url && msg.attachment_kind === 'image' && (
            <button
              onClick={() => onImageOpen(msg.attachment_url!)}
              className="block mb-1 rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img
                src={msg.attachment_url}
                alt={msg.attachment_name ?? ''}
                className="max-w-[260px] max-h-[260px] object-cover rounded-xl"
              />
            </button>
          )}
          {msg.attachment_url && msg.attachment_kind === 'video' && (
            <video
              controls
              src={msg.attachment_url}
              className="max-w-[260px] max-h-[260px] rounded-xl mb-1"
            />
          )}
          {msg.attachment_url && msg.attachment_kind === 'audio' && (
            <audio controls src={msg.attachment_url} className="mb-1" />
          )}
          {msg.attachment_url && msg.attachment_kind === 'file' && (
            <a
              href={msg.attachment_url}
              target="_blank"
              rel="noreferrer"
              download={msg.attachment_name ?? undefined}
              className={`flex items-center gap-2 mb-1 px-3 py-2 rounded-lg ${
                isSent ? 'bg-chat-bubble-sent-foreground/10' : 'bg-background/50'
              } hover:opacity-80 transition-all max-w-[240px]`}
            >
              <Paperclip className="w-4 h-4 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{msg.attachment_name}</p>
                {msg.attachment_size && (
                  <p className="text-[10px] opacity-70">{formatBytes(msg.attachment_size)}</p>
                )}
              </div>
              <Download className="w-3.5 h-3.5 shrink-0" />
            </a>
          )}

          {/* Text */}
          {isEditing ? (
            <div className="flex flex-col gap-2 min-w-[200px]">
              <textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                className="bg-background/40 border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40 text-current resize-none"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  onClick={onEditCancel}
                  className="text-[11px] px-2 py-1 rounded-md hover:bg-background/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onEditSave}
                  className="text-[11px] px-2 py-1 rounded-md bg-background/30 hover:bg-background/50 font-semibold transition-colors inline-flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          ) : (
            msg.content && <p className="break-words whitespace-pre-wrap">{msg.content}</p>
          )}

          <div
            className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}
          >
            {msg.edited_at && (
              <span
                className={`text-[10px] italic ${isSent ? 'text-chat-bubble-sent-foreground/60' : 'text-muted-foreground'}`}
              >
                edited
              </span>
            )}
            <span
              className={`text-[10px] ${isSent ? 'text-chat-bubble-sent-foreground/60' : 'text-muted-foreground'}`}
            >
              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isSent && msg.is_read && (
              <span className="text-[10px] text-chat-bubble-sent-foreground/60">✓✓</span>
            )}
          </div>
        </div>

        {/* Sender-only actions menu */}
        {isSent && !isEditing && (
          <div ref={menuRef} className="relative self-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Message options"
              className="w-7 h-7 rounded-full bg-surface hover:bg-surface-hover flex items-center justify-center text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute top-8 right-0 z-30 glass-panel rounded-xl shadow-2xl py-1 animate-scale-in origin-top-right flex flex-col items-center gap-0.5 px-1">
                {msg.content !== null && msg.content !== '' && (
                  <button
                    onClick={() => {
                      onEditStart();
                      setMenuOpen(false);
                    }}
                    aria-label="Edit"
                    title="Edit"
                    className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-hover text-foreground transition-all hover:scale-110"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                  aria-label="Delete"
                  title="Delete"
                  className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-destructive/15 text-destructive transition-all hover:scale-110"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type TimelineEntry =
  | { kind: 'date'; label: string }
  | { kind: 'system'; label: string; icon: React.ReactNode }
  | { kind: 'message'; message: Message };

function buildTimeline(
  messages: Message[],
  blockEvents: { action: string; created_at: string; actor_id: string }[],
  otherName: string,
): TimelineEntry[] {
  const entries: { time: string; entry: TimelineEntry }[] = [];

  messages.forEach((m) => {
    entries.push({ time: m.created_at, entry: { kind: 'message', message: m } });
  });

  blockEvents.forEach((ev) => {
    const dateStr = new Date(ev.created_at).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const label =
      ev.action === 'block'
        ? `Blocked on ${dateStr}`
        : `Unblocked on ${dateStr}`;
    entries.push({
      time: ev.created_at,
      entry: {
        kind: 'system',
        label,
        icon:
          ev.action === 'block' ? (
            <Ban className="w-3 h-3" />
          ) : (
            <Check className="w-3 h-3" />
          ),
      },
    });
  });

  entries.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // Insert date dividers
  const out: TimelineEntry[] = [];
  let lastDate = '';
  for (const { time, entry } of entries) {
    const d = new Date(time).toDateString();
    if (d !== lastDate) {
      const dateLabel = new Date(time).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      out.push({ kind: 'date', label: dateLabel });
      lastDate = d;
    }
    out.push(entry);
  }
  return out;
}
