import { Shield, Swords, Target, Wand2 } from 'lucide-react'

export interface AvatarPreset {
  id: string
  label: string
  icon: typeof Swords
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'warrior', label: 'Guerreiro', icon: Swords },
  { id: 'mage', label: 'Mago', icon: Wand2 },
  { id: 'ranger', label: 'Ranger', icon: Target },
  { id: 'paladin', label: 'Paladino', icon: Shield },
]

export function getAvatarPreset(id: string | null | undefined): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((preset) => preset.id === id)
}
