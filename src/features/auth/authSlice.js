import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  mapProfileRecord,
  supabase,
  uploadAvatarToBucket,
} from "../../lib/supabase";

const baseState = {
  session: null,
  user: null,
  profile: null,
  status: "idle",
  error: null,
  authMode: "login",
};

const fetchProfileById = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw error;
  }

  return mapProfileRecord(data);
};

export const initializeAuth = createAsyncThunk(
  "auth/initializeAuth",
  async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    if (!session?.user) {
      return { session: null, user: null, profile: null };
    }

    const profile = await fetchProfileById(session.user.id);

    return {
      session,
      user: session.user,
      profile,
    };
  },
);

export const signInUser = createAsyncThunk(
  "auth/signInUser",
  async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    await supabase
      .from("profiles")
      .update({
        is_online: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);

    const profile = await fetchProfileById(data.user.id);

    return {
      session: data.session,
      user: data.user,
      profile,
    };
  },
);

export const signUpUser = createAsyncThunk(
  "auth/signUpUser",
  async (payload) => {
    const { avatarFile, email, password, fullName, nickname, bio, dateOfBirth } =
      payload;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          nickname,
          bio,
          date_of_birth: dateOfBirth,
        },
      },
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error("Signup failed. Please try again.");
    }

    let profile = null;
    const hasActiveSession = Boolean(data.session);

    if (hasActiveSession) {
      let avatarUrl = "";

      if (avatarFile) {
        avatarUrl = await uploadAvatarToBucket(data.user.id, avatarFile);
      }

      const profilePayload = {
        id: data.user.id,
        email,
        full_name: fullName,
        nickname,
        bio,
        date_of_birth: dateOfBirth,
        avatar_url: avatarUrl,
        is_online: true,
        last_seen_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(profilePayload, { onConflict: "id" });

      if (upsertError) {
        throw upsertError;
      }

      profile = await fetchProfileById(data.user.id);
    }

    return {
      session: data.session,
      user: data.user,
      profile,
      needsEmailVerification: !hasActiveSession,
    };
  },
);

export const saveProfile = createAsyncThunk(
  "auth/saveProfile",
  async ({ profileInput, avatarFile }, { getState }) => {
    const { auth } = getState();
    const userId = auth.user?.id;

    if (!userId) {
      throw new Error("No active user session found.");
    }

    let avatarUrl = auth.profile?.avatarUrl ?? "";
    if (avatarFile) {
      avatarUrl = await uploadAvatarToBucket(userId, avatarFile);
    }

    const updatePayload = {
      id: userId,
      email: auth.user.email,
      full_name: profileInput.fullName,
      nickname: profileInput.nickname,
      bio: profileInput.bio,
      date_of_birth: profileInput.dateOfBirth,
      avatar_url: avatarUrl,
      last_seen_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(updatePayload, { onConflict: "id" });

    if (error) {
      throw error;
    }

    return fetchProfileById(userId);
  },
);

export const signOutUser = createAsyncThunk("auth/signOutUser", async (_, { getState }) => {
  const userId = getState().auth.user?.id;

  if (userId) {
    await supabase
      .from("profiles")
      .update({
        is_online: false,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", userId);
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: baseState,
  reducers: {
    setSession(state, action) {
      state.session = action.payload.session;
      state.user = action.payload.user;
      state.profile = action.payload.profile;
    },
    setAuthMode(state, action) {
      state.authMode = action.payload;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.status = "loading";
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.session = action.payload.session;
        state.user = action.payload.user;
        state.profile = action.payload.profile;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(signInUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signInUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.session = action.payload.session;
        state.user = action.payload.user;
        state.profile = action.payload.profile;
      })
      .addCase(signInUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(signUpUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signUpUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.session = action.payload.session ?? null;
        state.user = action.payload.session ? action.payload.user : null;
        state.profile = action.payload.session ? action.payload.profile : null;
        state.error = action.payload.needsEmailVerification
          ? "Account created. Please verify your email, then sign in."
          : null;
      })
      .addCase(signUpUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(saveProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(saveProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.profile = action.payload;
      })
      .addCase(saveProfile.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error.message;
      })
      .addCase(signOutUser.fulfilled, () => baseState)
      .addCase(signOutUser.rejected, (state, action) => {
        state.error = action.error.message;
      });
  },
});

export const { clearAuthError, setAuthMode, setSession } = authSlice.actions;

export default authSlice.reducer;
