import { describe, expect, it } from 'vitest'
import { getItemImage, getRarityGlowColor, RARITY_GLOW_COLORS } from './itemVisuals'

describe('getItemImage', () => {
  it('mapeia cada uma das 3 armas para a imagem única', () => {
    expect(getItemImage('Cajado Arcano', 'weapon')).toBe('/assets/items/arma_leve.webp')
    expect(getItemImage('Arco de Caça', 'weapon')).toBe('/assets/items/arma_medio.webp')
    expect(getItemImage('Machado de Guerra', 'weapon')).toBe(
      '/assets/items/arma_pesado.webp',
    )
  })

  it('mapeia cada um dos 3 elmos para a imagem única', () => {
    expect(getItemImage('Capuz de Mago', 'helmet')).toBe('/assets/items/elmo_leve.webp')
    expect(getItemImage('Capuz de Couro', 'helmet')).toBe('/assets/items/elmo_medio.webp')
    expect(getItemImage('Elmo de Aço', 'helmet')).toBe('/assets/items/elmo_pesado.webp')
  })

  it('mapeia cada um dos 3 peitorais para a imagem única', () => {
    expect(getItemImage('Túnica Arcanista', 'chest')).toBe('/assets/items/peito_leve.webp')
    expect(getItemImage('Armadura de Couro', 'chest')).toBe(
      '/assets/items/peito_medio.webp',
    )
    expect(getItemImage('Armadura de Placas', 'chest')).toBe(
      '/assets/items/peito_pesado.webp',
    )
  })

  it('mapeia cada uma das 3 botas para a imagem única', () => {
    expect(getItemImage('Sandálias Místicas', 'boots')).toBe(
      '/assets/items/bota_leve.webp',
    )
    expect(getItemImage('Botas de Couro', 'boots')).toBe('/assets/items/bota_medio.webp')
    expect(getItemImage('Botas de Ferro', 'boots')).toBe('/assets/items/bota_pesado.webp')
  })

  it('usa o asset médio da categoria como fallback para nomes desconhecidos', () => {
    expect(getItemImage('Item Desconhecido', 'helmet')).toBe('/assets/items/elmo_medio.webp')
    expect(getItemImage('Nome Qualquer', 'boots')).toBe('/assets/items/bota_medio.webp')
    expect(getItemImage('Relíquia Comum', 'chest')).toBe('/assets/items/peito_medio.webp')
  })

  it('usa arma médio como fallback para categoria desconhecida', () => {
    expect(getItemImage('Alguma Coisa', 'shield')).toBe('/assets/items/arma_medio.webp')
  })
})

describe('getRarityGlowColor', () => {
  it('mapeia cada raridade para a cor de glow correspondente', () => {
    expect(getRarityGlowColor('common')).toBe('rgba(16, 185, 129, 0.25)')
    expect(getRarityGlowColor('rare')).toBe('rgba(59, 130, 246, 0.35)')
    expect(getRarityGlowColor('epic')).toBe('rgba(168, 85, 247, 0.40)')
    expect(getRarityGlowColor('legendary')).toBe('rgba(245, 158, 11, 0.45)')
  })

  it('retorna a cor comum quando a raridade é indefinida', () => {
    expect(getRarityGlowColor(undefined)).toBe(RARITY_GLOW_COLORS.common)
  })
})