// Mapeamento estrito 1:1 entre nome de item e asset visual.
// Existem exatamente 12 imagens em public/assets/items, portanto existem
// exatamente 12 itens (4 slots × 3 classes). Cada nome aponta para uma
// imagem única — sem sinônimos, sem heurísticas de substring.

const ITEM_MAP: Record<string, string> = {
  // Weapons
  'Cajado Arcano': '/assets/items/arma_leve.webp',
  'Arco de Caça': '/assets/items/arma_medio.webp',
  'Machado de Guerra': '/assets/items/arma_pesado.webp',
  // Helmets
  'Capuz de Mago': '/assets/items/elmo_leve.webp',
  'Capuz de Couro': '/assets/items/elmo_medio.webp',
  'Elmo de Aço': '/assets/items/elmo_pesado.webp',
  // Chests
  'Túnica Arcanista': '/assets/items/peito_leve.webp',
  'Armadura de Couro': '/assets/items/peito_medio.webp',
  'Armadura de Placas': '/assets/items/peito_pesado.webp',
  // Boots
  'Sandálias Místicas': '/assets/items/bota_leve.webp',
  'Botas de Couro': '/assets/items/bota_medio.webp',
  'Botas de Ferro': '/assets/items/bota_pesado.webp',
}

const CATEGORY_FALLBACK_PREFIX: Record<string, string> = {
  helmet: 'elmo',
  chest: 'peito',
  weapon: 'arma',
  boots: 'bota',
}

export function getItemImage(name: string, category: string): string {
  const asset = ITEM_MAP[name]
  if (asset) return asset

  const prefix = CATEGORY_FALLBACK_PREFIX[category] ?? 'arma'
  return `/assets/items/${prefix}_medio.webp`
}