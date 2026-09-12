import { describe, expect, it } from 'vitest'
import { getItemImage } from './itemVisuals'

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