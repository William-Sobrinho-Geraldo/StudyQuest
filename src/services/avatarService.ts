import { supabase } from '../lib/supabase'

const AVATAR_BUCKET = 'avatars'

function getExtension(file: File): 'jpg' | 'png' | 'webp' {
  switch (file.type) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return 'jpg'
  }
}

export async function uploadAvatarImage(userId: string, file: File): Promise<string> {
  const path = `${userId}/${userId}_${Date.now()}.${getExtension(file)}`
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: true,
  })
  if (error) throw error
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function updateProfileAvatarUrl(userId: string, avatarUrl: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId)
  if (error) throw error
}