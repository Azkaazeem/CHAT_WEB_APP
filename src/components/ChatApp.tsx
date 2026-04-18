import { useEffect, useState, useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { useProfiles, useMyProfile } from '@/hooks/useProfiles';
import { useUnreadCounts } from '@/hooks/useMessages';
import { useConversations, ensureConversation, setPinned, clearChat, hideChat } from '@/hooks/useConversations';
import { useBlocks } from '@/hooks/useBlocks';
import { usePresence } from '@/hooks/usePresence';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { ProfileEditor } from './ProfileEditor';
import { NewChatDrawer } from './NewChatDrawer';
import { AvatarLightbox } from './AvatarLightbox';
import { Alert, Toast } from '@/lib/alert';

type Profile = Tables<'profiles'>;

interface ChatAppProps {
  userId: string;
  onSignOut: () => void;
}

export function ChatApp({ userId, onSignOut }: ChatAppProps) {
  // Keep useProfiles alive purely so the realtime profile subscription stays mounted globally
  useProfiles(userId);
  const { profile: myProfile, updateProfile } = useMyProfile(userId);
  const { items, refresh } = useConversations(userId);
  const unreadCounts = useUnreadCounts(userId);
  const onlineIds = usePresence(userId);
  const blocks = useBlocks(userId);

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null);

  // Resolve selected conversation row
  const selectedItem = useMemo(
    () => items.find((c) => c.otherUser.user_id === selectedUser?.user_id) ?? null,
    [items, selectedUser?.user_id],
  );

  // Keep selectedUser data fresh from items list (reflects realtime profile changes)
  useEffect(() => {
    if (!selectedUser) return;
    const fresh = items.find((c) => c.otherUser.user_id === selectedUser.user_id);
    if (fresh && fresh.otherUser !== selectedUser) {
      setSelectedUser(fresh.otherUser);
    }
  }, [items, selectedUser]);

  const handleStartNewChat = async (profile: Profile) => {
    await ensureConversation(userId, profile.user_id);
    setShowNewChat(false);
    setSelectedUser(profile);
    refresh();
  };

  const handlePinToggle = async (item: typeof items[number]) => {
    const isUserA = item.conversation.user_a === userId;
    await setPinned(item.conversation.id, isUserA, !item.isPinned);
    Toast.fire({
      icon: 'success',
      title: item.isPinned ? 'Unpinned' : 'Pinned to top',
    });
  };

  const handleClearChat = async (item: typeof items[number]) => {
    const result = await Alert.fire({
      title: 'Clear this chat?',
      text: `All messages with ${item.otherUser.display_name} will be hidden from your view.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, clear',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    const isUserA = item.conversation.user_a === userId;
    await clearChat(item.conversation.id, isUserA);
    Toast.fire({ icon: 'success', title: 'Chat cleared' });
  };

  const handleDeleteChat = async (item: typeof items[number]) => {
    const result = await Alert.fire({
      title: 'Delete this chat?',
      text: `This chat with ${item.otherUser.display_name} will be removed from your list.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    const isUserA = item.conversation.user_a === userId;
    await hideChat(item.conversation.id, isUserA);
    if (selectedUser?.user_id === item.otherUser.user_id) setSelectedUser(null);
    Toast.fire({ icon: 'success', title: 'Chat deleted' });
  };

  const handleBlockToggle = async (item: typeof items[number]) => {
    const otherId = item.otherUser.user_id;
    const blocked = Boolean(blocks.iBlocked(otherId));

    if (blocked) {
      const result = await Alert.fire({
        title: `Unblock ${item.otherUser.display_name}?`,
        text: 'They will be able to message you again.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Unblock',
        cancelButtonText: 'Cancel',
      });
      if (!result.isConfirmed) return;
      await blocks.unblock(otherId);
      Toast.fire({ icon: 'success', title: `${item.otherUser.display_name} unblocked` });
    } else {
      const result = await Alert.fire({
        title: `Block ${item.otherUser.display_name}?`,
        text: 'You will not receive messages from this person until you unblock them.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Block',
        cancelButtonText: 'Cancel',
      });
      if (!result.isConfirmed) return;
      await blocks.block(otherId);
      Toast.fire({ icon: 'success', title: `${item.otherUser.display_name} blocked` });
    }
  };

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <div
        className={`w-full md:w-80 lg:w-96 border-r border-border shrink-0 ${
          selectedUser ? 'hidden md:flex md:flex-col' : 'flex flex-col'
        }`}
      >
        <ChatList
          items={items}
          selectedUserId={selectedUser?.user_id}
          unreadCounts={unreadCounts}
          onlineIds={onlineIds}
          currentUserProfile={myProfile}
          onSelect={(item) => setSelectedUser(item.otherUser)}
          onOpenProfile={() => setShowProfile(true)}
          onAvatarOpen={(url, name) => setLightbox({ url, name })}
          onNewChat={() => setShowNewChat(true)}
          onPinToggle={handlePinToggle}
          onClearChat={handleClearChat}
          onDeleteChat={handleDeleteChat}
          onBlockToggle={handleBlockToggle}
          isBlockedByMe={(id) => Boolean(blocks.iBlocked(id))}
        />
      </div>

      {/* Chat area */}
      <div
        className={`flex-1 ${
          selectedUser ? 'flex flex-col' : 'hidden md:flex md:flex-col'
        }`}
      >
        {selectedUser ? (
          <ChatWindow
            currentUserId={userId}
            otherUser={selectedUser}
            isOnline={onlineIds.has(selectedUser.user_id)}
            clearedAt={selectedItem?.clearedAt ?? null}
            iBlocked={Boolean(blocks.iBlocked(selectedUser.user_id))}
            blockedMe={Boolean(blocks.blockedMe(selectedUser.user_id))}
            blockEvents={blocks.eventsBetween(selectedUser.user_id)}
            onBack={() => setSelectedUser(null)}
            onAvatarOpen={(url, name) => setLightbox({ url, name })}
            onUnblock={async () => {
              await blocks.unblock(selectedUser.user_id);
              Toast.fire({ icon: 'success', title: 'Unblocked' });
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4 animate-float">
              <MessageCircle className="w-10 h-10 text-primary/40" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Welcome to ChatFlow</h2>
            <p className="text-muted-foreground text-sm max-w-xs">
              Pick a chat from the side, or start a new one
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showProfile && (
        <ProfileEditor
          profile={myProfile}
          userId={userId}
          onUpdate={updateProfile}
          onClose={() => setShowProfile(false)}
          onSignOut={onSignOut}
        />
      )}

      <NewChatDrawer
        open={showNewChat}
        currentUserId={userId}
        onClose={() => setShowNewChat(false)}
        onPick={handleStartNewChat}
      />

      {lightbox && (
        <AvatarLightbox
          url={lightbox.url}
          name={lightbox.name}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
