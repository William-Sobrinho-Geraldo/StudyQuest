import { describe, expect, it } from 'vitest'
import {
  BACKGROUND_MUSIC_TRACKS,
  DEFAULT_TRACK_ID,
  getTrackById,
  resolveTrackId,
} from './backgroundMusicTracks'

describe('backgroundMusicTracks', () => {
  it('expõe quatro faixas de concentração distintas', () => {
    expect(BACKGROUND_MUSIC_TRACKS.map((track) => track.id)).toEqual([
      'focus',
      'active',
      'pirate',
      'battle',
    ])
  })

  it('define Foco Calmo como faixa padrão', () => {
    expect(DEFAULT_TRACK_ID).toBe('focus')
  })

  it('resolve faixa por id', () => {
    expect(getTrackById('active')?.name).toBe('Concentração Ativa')
    expect(getTrackById('pirate')?.name).toBe('Aventura de Piratas')
    expect(getTrackById('battle')?.name).toBe('RPG Agitado')
    expect(getTrackById('nao-existe')).toBeUndefined()
    expect(getTrackById(null)).toBeUndefined()
    expect(getTrackById(undefined)).toBeUndefined()
  })

  it('resolveTrackId cai para o padrão quando inválido ou ausente', () => {
    expect(resolveTrackId('battle')).toBe('battle')
    expect(resolveTrackId('nao-existe')).toBe('focus')
    expect(resolveTrackId(null)).toBe('focus')
    expect(resolveTrackId(undefined)).toBe('focus')
  })

  it('migra ids antigos para os novos', () => {
    expect(resolveTrackId('lofi')).toBe('active')
    expect(resolveTrackId('deep')).toBe('pirate')
    expect(resolveTrackId('rpg')).toBe('battle')
  })

  it('todas as faixas possuem nome, descrição e src', () => {
    for (const track of BACKGROUND_MUSIC_TRACKS) {
      expect(track.name.length).toBeGreaterThan(0)
      expect(track.description.length).toBeGreaterThan(0)
      expect(track.src.length).toBeGreaterThan(0)
    }
  })
})
