import focusCalmo from '../assets/audio/bg-music.mp3'
import concentracaoAtiva from '../assets/audio/focus-lofi.mp3'
import aventuraPiratas from '../assets/audio/deep-focus.mp3'
import rpgAgitado from '../assets/audio/rpg-indie.mp3'

export interface BackgroundMusicTrack {
  id: string
  name: string
  description: string
  src: string
}

export const BACKGROUND_MUSIC_TRACKS: BackgroundMusicTrack[] = [
  {
    id: 'focus',
    name: 'Foco Calmo',
    description: 'Arpejos suaves em ritmo moderado',
    src: focusCalmo,
  },
  {
    id: 'active',
    name: 'Concentração Ativa',
    description: 'Textura cristalina com pulso leve',
    src: concentracaoAtiva,
  },
  {
    id: 'pirate',
    name: 'Aventura de Piratas',
    description: 'Ritmo dançante de aventura no mar',
    src: aventuraPiratas,
  },
  {
    id: 'battle',
    name: 'RPG Agitado',
    description: 'Pulso marcante de batalha',
    src: rpgAgitado,
  },
]

export const DEFAULT_TRACK_ID = 'focus'

export function getTrackById(id: string | null | undefined): BackgroundMusicTrack | undefined {
  if (!id) return undefined
  return BACKGROUND_MUSIC_TRACKS.find((track) => track.id === id)
}

/** Mapeia ids antigos para os novos, preservando seleções persistidas. */
const LEGACY_TRACK_ID_MAP: Record<string, string> = {
  lofi: 'active',
  deep: 'pirate',
  rpg: 'battle',
}

/**
 * Resolve um valor bruto (ex.: vindo do localStorage) para um id de faixa
 * válido, caindo para a faixa padrão quando ausente ou inválido.
 */
export function resolveTrackId(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) return DEFAULT_TRACK_ID
  const migrated = LEGACY_TRACK_ID_MAP[raw] ?? raw
  return getTrackById(migrated) ? migrated : DEFAULT_TRACK_ID
}
