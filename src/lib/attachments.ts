import { supabase } from '@/integrations/supabase/client';

export type AttachmentKind = 'image' | 'video' | 'audio' | 'file';

export function detectKind(file: File): AttachmentKind {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

/**
 * Uploads a file to the chat-attachments bucket under the current user's folder.
 * Returns a long-lived signed URL (24h) that both participants can read.
 */
export async function uploadChatAttachment(userId: string, file: File) {
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${userId}/${safeName}`;

  const { error: upErr } = await supabase.storage
    .from('chat-attachments')
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
    });
  if (upErr) throw upErr;

  // Sign URL valid for 7 days; since the bucket is private + RLS allows authenticated read.
  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data) throw error ?? new Error('Failed to create signed URL');

  return {
    url: data.signedUrl,
    path,
    type: file.type || 'application/octet-stream',
    kind: detectKind(file),
    name: file.name,
    size: file.size,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
