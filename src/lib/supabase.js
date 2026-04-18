import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export const buildThreadPair = (userIdA, userIdB) =>
  [userIdA, userIdB].sort((left, right) => left.localeCompare(right));

export const mapProfileRecord = (profile) => ({
  id: profile.id,
  email: profile.email ?? "",
  fullName: profile.full_name ?? "",
  nickname: profile.nickname ?? "",
  dateOfBirth: profile.date_of_birth ?? "",
  bio: profile.bio ?? "",
  avatarUrl: profile.avatar_url ?? "",
  isOnline: Boolean(profile.is_online),
  lastSeenAt: profile.last_seen_at ?? null,
  createdAt: profile.created_at ?? null,
});

export const uploadAvatarToBucket = async (userId, file) => {
  const extension = file.name.split(".").pop();
  const filePath = `${userId}/${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  return publicUrl;
};
