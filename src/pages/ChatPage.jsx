import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, LogOut, Search, SendHorizonal, UserPen } from "lucide-react";
import gsap from "gsap";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { saveProfile, setSession, signOutUser } from "../features/auth/authSlice";
import {
  appendMessage,
  fetchUsers,
  openConversation,
  resetChatState,
  sendMessage,
  setSearchTerm,
  updateUserPresence,
} from "../features/chat/chatSlice";
import { formatDate, formatTime, getInitials, relativePresence } from "../lib/format";
import { mapProfileRecord, supabase } from "../lib/supabase";

const initialProfileDraft = {
  fullName: "",
  nickname: "",
  bio: "",
  dateOfBirth: "",
};

export default function ChatPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const messagesRef = useRef(null);
  const { user, profile, status: authStatus } = useAppSelector((state) => state.auth);
  const {
    users,
    activeUser,
    activeThreadId,
    messages,
    searchTerm,
    usersStatus,
    sending,
  } = useAppSelector((state) => state.chat);

  const [draft, setDraft] = useState("");
  const [profileDraft, setProfileDraft] = useState(initialProfileDraft);
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");

  useEffect(() => {
    if (profile) {
      setProfileDraft({
        fullName: profile.fullName,
        nickname: profile.nickname,
        bio: profile.bio,
        dateOfBirth: profile.dateOfBirth,
      });
      setProfilePreview(profile.avatarUrl);
    }
  }, [profile]);

  useEffect(() => {
    if (!rootRef.current) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-chat-panel]",
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.85, stagger: 0.08, ease: "power3.out" },
      );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    dispatch(fetchUsers());

    const authSubscription = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        dispatch(setSession({ session: null, user: null, profile: null }));
        dispatch(resetChatState());
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      dispatch(
        setSession({
          session,
          user: session.user,
          profile: data ? mapProfileRecord(data) : null,
        }),
      );
    });

    const profileChannel = supabase
      .channel("profiles-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.new?.id && payload.new.id !== user.id) {
            dispatch(updateUserPresence(mapProfileRecord(payload.new)));
          }
        },
      )
      .subscribe();

    return () => {
      authSubscription.data.subscription.unsubscribe();
      supabase.removeChannel(profileChannel);
    };
  }, [dispatch, user?.id]);

  useEffect(() => {
    if (!activeThreadId || !user?.id) {
      return undefined;
    }

    const channel = supabase
      .channel(`messages-${activeThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `thread_id=eq.${activeThreadId}`,
        },
        (payload) => {
          dispatch(
            appendMessage({
              id: payload.new.id,
              threadId: payload.new.thread_id,
              senderId: payload.new.sender_id,
              content: payload.new.content,
              createdAt: payload.new.created_at,
              own: payload.new.sender_id === user.id,
            }),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThreadId, dispatch, user?.id]);

  useEffect(() => {
    if (!messagesRef.current) {
      return;
    }

    messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    gsap.fromTo(
      "[data-message-item]",
      { opacity: 0, y: 16, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.02, ease: "power2.out" },
    );
  }, [messages]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
      return users;
    }

    const term = searchTerm.toLowerCase();
    return users.filter((item) =>
      [item.fullName, item.nickname, item.bio].some((field) =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [searchTerm, users]);

  const submitMessage = async (event) => {
    event.preventDefault();
    const nextMessage = draft.trim();

    if (!nextMessage) {
      await Swal.fire({
        title: "Empty message",
        text: "Message likhe baghair send nahi ho sakta.",
        icon: "warning",
        background: "#0f1425",
        color: "#eef2ff",
        confirmButtonColor: "#7c6bff",
      });
      return;
    }

    await dispatch(sendMessage(nextMessage));
    setDraft("");
  };

  const submitProfile = async (event) => {
    event.preventDefault();

    try {
      await dispatch(saveProfile({ profileInput: profileDraft, avatarFile: profileAvatarFile })).unwrap();
      setProfileAvatarFile(null);
      await Swal.fire({
        title: "Profile updated",
        text: "Aap ki profile successfully save ho gayi.",
        icon: "success",
        background: "#0f1425",
        color: "#eef2ff",
        confirmButtonColor: "#7c6bff",
      });
    } catch (submitError) {
      await Swal.fire({
        title: "Profile update failed",
        text: submitError?.message || "Please try again.",
        icon: "error",
        background: "#0f1425",
        color: "#eef2ff",
        confirmButtonColor: "#ff5b7f",
      });
    }
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout?",
      text: "Aap session close karna chahte ho?",
      icon: "question",
      background: "#0f1425",
      color: "#eef2ff",
      confirmButtonColor: "#7c6bff",
      showCancelButton: true,
      cancelButtonColor: "#20283f",
      confirmButtonText: "Yes, logout",
    });

    if (!result.isConfirmed) {
      return;
    }

    await dispatch(signOutUser());
    navigate("/");
  };

  const chooseProfileAvatar = (file) => {
    if (!file) {
      return;
    }

    setProfileAvatarFile(file);
    setProfilePreview(URL.createObjectURL(file));
  };

  return (
    <main className="route-shell chat-route" ref={rootRef}>
      <aside className="chat-side-panel" data-chat-panel>
        <div className="profile-badge">
          <div className="profile-avatar">
            {profile?.avatarUrl ? (
              <img alt={profile.fullName} src={profile.avatarUrl} />
            ) : (
              <span>{getInitials(profile?.fullName)}</span>
            )}
          </div>
          <div>
            <strong>{profile?.fullName}</strong>
            <p>{profile?.nickname}</p>
          </div>
        </div>

        <button className="outline-cta full-width" type="button">
          <UserPen size={15} />
          Profile active
        </button>
        <button className="danger-cta full-width" onClick={handleLogout} type="button">
          <LogOut size={15} />
          Logout
        </button>
      </aside>

      <section className="chat-users-panel" data-chat-panel>
        <div className="users-header">
          <div>
            <p className="label-line">User directory</p>
            <h2>Chats</h2>
          </div>
          <div className="search-input-shell">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search users"
              value={searchTerm}
              onChange={(event) => dispatch(setSearchTerm(event.target.value))}
            />
          </div>
        </div>

        <div className="users-stack">
          {usersStatus === "loading" ? <p className="meta-note">Loading users...</p> : null}
          {filteredUsers.map((item) => (
            <button
              className={`user-row-card ${activeUser?.id === item.id ? "active" : ""}`}
              key={item.id}
              type="button"
              onClick={() => dispatch(openConversation(item))}
            >
              <div className="mini-avatar">
                {item.avatarUrl ? (
                  <img alt={item.fullName} src={item.avatarUrl} />
                ) : (
                  <span>{getInitials(item.fullName)}</span>
                )}
              </div>
              <div className="user-row-copy">
                <div className="user-row-top">
                  <strong>{item.fullName}</strong>
                  <span>{item.isOnline ? "online" : formatDate(item.lastSeenAt)}</span>
                </div>
                <p>{item.bio || item.nickname}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="chat-thread-panel" data-chat-panel>
        {activeUser ? (
          <>
            <div className="thread-topbar">
              <div className="profile-badge tight">
                <div className="mini-avatar">
                  {activeUser.avatarUrl ? (
                    <img alt={activeUser.fullName} src={activeUser.avatarUrl} />
                  ) : (
                    <span>{getInitials(activeUser.fullName)}</span>
                  )}
                </div>
                <div>
                  <strong>{activeUser.fullName}</strong>
                  <p>{relativePresence(activeUser.isOnline, activeUser.lastSeenAt)}</p>
                </div>
              </div>
            </div>

            <div className="thread-messages" ref={messagesRef}>
              {messages.map((message) => (
                <div className={`thread-row ${message.own ? "own" : ""}`} key={message.id}>
                  <div className={`thread-bubble ${message.own ? "own" : ""}`} data-message-item>
                    <p>{message.content}</p>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>

            <form className="thread-composer" onSubmit={submitMessage}>
              <input
                placeholder={`Message ${activeUser.fullName}`}
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <button className="send-fab" disabled={sending} type="submit">
                <SendHorizonal size={15} />
              </button>
            </form>
          </>
        ) : (
          <div className="thread-empty">
            <p>User select karo aur direct conversation open ho jayegi.</p>
          </div>
        )}
      </section>

      <aside className="chat-profile-panel" data-chat-panel>
        <div className="users-header compact-gap">
          <div>
            <p className="label-line">Editable profile</p>
            <h2>Settings</h2>
          </div>
        </div>

        <form className="profile-edit-form" onSubmit={submitProfile}>
          <div className="profile-pic-editor">
            <div className="profile-avatar large">
              {profilePreview ? (
                <img alt="Profile preview" src={profilePreview} />
              ) : (
                <span>{getInitials(profile?.fullName)}</span>
              )}
            </div>
            <label className="outline-cta" htmlFor="profile-image">
              <Camera size={14} />
              Change pic
            </label>
            <input
              accept="image/*"
              hidden
              id="profile-image"
              type="file"
              onChange={(event) => chooseProfileAvatar(event.target.files?.[0])}
            />
          </div>

          <label className="compact-field">
            <span>Full name</span>
            <input
              type="text"
              value={profileDraft.fullName}
              onChange={(event) =>
                setProfileDraft((current) => ({ ...current, fullName: event.target.value }))
              }
              required
            />
          </label>
          <label className="compact-field">
            <span>Nickname</span>
            <input
              type="text"
              value={profileDraft.nickname}
              onChange={(event) =>
                setProfileDraft((current) => ({ ...current, nickname: event.target.value }))
              }
              required
            />
          </label>
          <label className="compact-field">
            <span>DOB</span>
            <input
              type="date"
              value={profileDraft.dateOfBirth}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  dateOfBirth: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="compact-field">
            <span>Bio</span>
            <textarea
              rows="4"
              value={profileDraft.bio}
              onChange={(event) =>
                setProfileDraft((current) => ({ ...current, bio: event.target.value }))
              }
              required
            />
          </label>

          <button className="primary-cta wide" disabled={authStatus === "loading"} type="submit">
            Save changes
          </button>
        </form>
      </aside>
    </main>
  );
}
