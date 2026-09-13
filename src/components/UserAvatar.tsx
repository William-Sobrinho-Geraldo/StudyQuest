import { getAvatarDefinition } from '../utils/avatars'

export interface UserAvatarProps {
  avatarId: string | null | undefined
  name?: string | null
  className?: string
}

function nameInitial(name?: string | null): string {
  const trimmed = name?.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

export function UserAvatar({ avatarId, name, className }: UserAvatarProps) {
  const avatar = getAvatarDefinition(avatarId)
  const base = className ?? 'h-14 w-14 rounded-full'

  if (!avatar) {
    return (
      <div
        data-testid="user-avatar-fallback"
        className={`${base} flex items-center justify-center bg-indigo-500 text-xl font-bold text-white`}
      >
        {nameInitial(name)}
      </div>
    )
  }

  return (
    <img
      data-testid="user-avatar-image"
      src={avatar.imagePath}
      alt={avatar.name}
      className={`${base} object-cover`}
    />
  )
}
