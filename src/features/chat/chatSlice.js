import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { buildThreadPair, mapProfileRecord, supabase } from "../../lib/supabase";

const initialState = {
  users: [],
  activeUser: null,
  activeThreadId: null,
  messages: [],
  usersStatus: "idle",
  messagesStatus: "idle",
  sending: false,
  searchTerm: "",
  error: null,
};

const normalizeMessage = (message, currentUserId) => ({
  id: message.id,
  threadId: message.thread_id,
  senderId: message.sender_id,
  content: message.content,
  createdAt: message.created_at,
  own: message.sender_id === currentUserId,
});

export const fetchUsers = createAsyncThunk(
  "chat/fetchUsers",
  async (_, { getState }) => {
    const currentUserId = getState().auth.user?.id;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUserId)
      .order("is_online", { ascending: false })
      .order("full_name", { ascending: true });

    if (error) {
      throw error;
    }

    return data.map(mapProfileRecord);
  },
);

export const openConversation = createAsyncThunk(
  "chat/openConversation",
  async (otherUser, { getState }) => {
    const currentUserId = getState().auth.user?.id;
    if (!currentUserId) {
      throw new Error("No active user session found.");
    }

    const [participantOne, participantTwo] = buildThreadPair(
      currentUserId,
      otherUser.id,
    );

    const { data: existingThread, error: selectThreadError } = await supabase
      .from("direct_threads")
      .select("id")
      .eq("participant_one", participantOne)
      .eq("participant_two", participantTwo)
      .maybeSingle();

    if (selectThreadError) {
      throw selectThreadError;
    }

    let threadId = existingThread?.id;

    if (!threadId) {
      const { data: createdThread, error: createThreadError } = await supabase
        .from("direct_threads")
        .insert({
          participant_one: participantOne,
          participant_two: participantTwo,
        })
        .select("id")
        .single();

      if (createThreadError) {
        throw createThreadError;
      }

      threadId = createdThread.id;
    }

    const { data: messages, error: messagesError } = await supabase
      .from("direct_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      throw messagesError;
    }

    return {
      activeUser: otherUser,
      activeThreadId: threadId,
      messages: messages.map((message) =>
        normalizeMessage(message, currentUserId),
      ),
    };
  },
);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (content, { getState }) => {
    const state = getState();
    const senderId = state.auth.user?.id;
    const threadId = state.chat.activeThreadId;

    if (!senderId || !threadId) {
      throw new Error("Select a conversation before sending a message.");
    }

    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        thread_id: threadId,
        sender_id: senderId,
        content,
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await supabase
      .from("direct_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    return normalizeMessage(data, senderId);
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setSearchTerm(state, action) {
      state.searchTerm = action.payload;
    },
    appendMessage(state, action) {
      const exists = state.messages.some((message) => message.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    updateUserPresence(state, action) {
      const index = state.users.findIndex((user) => user.id === action.payload.id);
      if (index !== -1) {
        state.users[index] = {
          ...state.users[index],
          ...action.payload,
        };
      }

      if (state.activeUser?.id === action.payload.id) {
        state.activeUser = {
          ...state.activeUser,
          ...action.payload,
        };
      }
    },
    resetChatState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.usersStatus = "loading";
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.usersStatus = "succeeded";
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.usersStatus = "failed";
        state.error = action.error.message;
      })
      .addCase(openConversation.pending, (state) => {
        state.messagesStatus = "loading";
      })
      .addCase(openConversation.fulfilled, (state, action) => {
        state.messagesStatus = "succeeded";
        state.activeUser = action.payload.activeUser;
        state.activeThreadId = action.payload.activeThreadId;
        state.messages = action.payload.messages;
      })
      .addCase(openConversation.rejected, (state, action) => {
        state.messagesStatus = "failed";
        state.error = action.error.message;
      })
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        state.messages.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.error.message;
      });
  },
});

export const { appendMessage, resetChatState, setSearchTerm, updateUserPresence } =
  chatSlice.actions;

export default chatSlice.reducer;
