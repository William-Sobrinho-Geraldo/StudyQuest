import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

type HookModule = typeof import('./useBackgroundMusic')

let useBackgroundMusic: HookModule['useBackgroundMusic']

beforeEach(async () => {
  vi.resetModules()
  localStorage.clear()
  const mod = await import('./useBackgroundMusic')
  useBackgroundMusic = mod.useBackgroundMusic
})

describe('useBackgroundMusic', () => {
  it('expõe o catálogo e a faixa padrão sem estar mutado', () => {
    const { result } = renderHook(() => useBackgroundMusic())

    expect(result.current.tracks).toHaveLength(4)
    expect(result.current.trackId).toBe('focus')
    expect(result.current.currentTrackId).toBe('focus')
    expect(result.current.track.name).toBe('Foco Calmo')
    expect(result.current.isMuted).toBe(false)
  })

  it('seleciona e persiste uma faixa', () => {
    const { result } = renderHook(() => useBackgroundMusic())

    act(() => {
      result.current.setTrack('battle')
    })

    expect(result.current.trackId).toBe('battle')
    expect(result.current.track.name).toBe('RPG Agitado')
    expect(localStorage.getItem('studyquest:bg-music-track')).toBe('battle')
  })

  it('ignora faixa inválida sem alterar o estado', () => {
    const { result } = renderHook(() => useBackgroundMusic())

    act(() => {
      result.current.setTrack('nao-existe')
    })

    expect(result.current.trackId).toBe('focus')
    expect(localStorage.getItem('studyquest:bg-music-track')).toBeNull()
  })

  it('alterna e persiste o estado de mudo', () => {
    const { result } = renderHook(() => useBackgroundMusic())

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isMuted).toBe(true)
    expect(result.current.muted).toBe(true)
    expect(localStorage.getItem('studyquest:bg-music-muted')).toBe('true')
  })
})
