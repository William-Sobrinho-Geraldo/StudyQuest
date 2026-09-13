// Catálogo de avatares (Fase 1 - Dados e Catálogo).
//
// Raridades e aquisição:
//   - comum    (Grátis): desbloqueados por padrão para todo jogador.
//   - epico    (Mercado): adquiridos no Mercado.
//   - lendario (Mercado/Oculto): lendario_1 é comprável no Mercado;
//     lendario_2 é oculto/inobtenível no momento (apenas metadados).
//
// Os assets são 1:1 com os arquivos em public/assets/avatars, sempre
// no formato `${id}.webp`. A característica "oculto" de lendario_2 é
// expressa exclusivamente via isMarketObtainable, mantendo os IDs e
// caminhos 100% padronizados e previsíveis.

export type AvatarRarity = 'comum' | 'epico' | 'lendario'

export interface AvatarDefinition {
  id: string
  name: string
  rarity: AvatarRarity
  imagePath: string
  isMarketObtainable: boolean
}

export const DEFAULT_AVATAR_ID = 'comum_1'

export const DEFAULT_UNLOCKED_AVATARS: readonly string[] = [
  'comum_1',
  'comum_2',
  'comum_3',
  'comum_4',
  'comum_5',
]

export const AVATARS: readonly AvatarDefinition[] = [
  // Comuns (Grátis)
  { id: 'comum_1', name: 'Aventureiro', rarity: 'comum', imagePath: '/assets/avatars/comum_1.webp', isMarketObtainable: false },
  { id: 'comum_2', name: 'Estudioso', rarity: 'comum', imagePath: '/assets/avatars/comum_2.webp', isMarketObtainable: false },
  { id: 'comum_3', name: 'Desbravador', rarity: 'comum', imagePath: '/assets/avatars/comum_3.webp', isMarketObtainable: false },
  { id: 'comum_4', name: 'Focado', rarity: 'comum', imagePath: '/assets/avatars/comum_4.webp', isMarketObtainable: false },
  { id: 'comum_5', name: 'Curioso', rarity: 'comum', imagePath: '/assets/avatars/comum_5.webp', isMarketObtainable: false },
  // Épicos (Mercado)
  { id: 'epico_6', name: 'Estrategista', rarity: 'epico', imagePath: '/assets/avatars/epico_6.webp', isMarketObtainable: true },
  { id: 'epico_7', name: 'Sábio', rarity: 'epico', imagePath: '/assets/avatars/epico_7.webp', isMarketObtainable: true },
  { id: 'epico_8', name: 'Mestre do Saber', rarity: 'epico', imagePath: '/assets/avatars/epico_8.webp', isMarketObtainable: true },
  // Lendários
  { id: 'lendario_1', name: 'Lenda Viva', rarity: 'lendario', imagePath: '/assets/avatars/lendario_1.webp', isMarketObtainable: true },
  { id: 'lendario_2', name: 'Ascendido', rarity: 'lendario', imagePath: '/assets/avatars/lendario_2.webp', isMarketObtainable: false },
]

const AVATAR_BY_ID: ReadonlyMap<string, AvatarDefinition> = new Map(
  AVATARS.map((avatar) => [avatar.id, avatar]),
)

export function getAvatarDefinition(
  id: string | null | undefined,
): AvatarDefinition | undefined {
  if (!id) return undefined
  return AVATAR_BY_ID.get(id)
}
