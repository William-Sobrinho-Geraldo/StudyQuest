import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

type HookModule = typeof import('./useBackgroundMusic')

let useBackgroundMusic: HookModule['useBackgroundMusic']
let suspendBackgroundMusicForAd: HookModule['suspendBackgroundMusicForAd']
let resumeBackgroundMusicAfterAd: HookModule['resumeBackgroundMusicAfterAd']
let suspendBackgroundMusicForSessionEnd: HookModule['suspendBackgroundMusicForSessionEnd']
let resumeBackgroundMusicAfterSessionClaim: HookModule['resumeBackgroundMusicAfterSessionClaim']

/**
 * Implementação falsa de `HTMLAudioElement` usada apenas nos testes. O jsdom
 * não reproduz mídia de verdade, então controlamos play/pause para verificar de
 * forma determinística o comportamento durante os anúncios.
 */
class FakeAudio {
  static instances: FakeAudio[] = []

  src = ''
  loop = false
  volume = 1
  muted = false
  preload = ''
  paused = true
  playCalls = 0
  pauseCalls = 0

  constructor(src?: string) {
    this.src = src ?? ''
    FakeAudio.instances.push(this)
  }

  play(): Promise<void> {
    this.playCalls += 1
    this.paused = false
    return Promise.resolve()
  }

  pause(): void {
    this.pauseCalls += 1
    this.paused = true
  }

  load(): void {}
}

beforeEach(async () => {
  vi.resetModules()
  localStorage.clear()
  FakeAudio.instances = []
  vi.stubGlobal('Audio', FakeAudio)
  const mod = await import('./useBackgroundMusic')
  useBackgroundMusic = mod.useBackgroundMusic
  suspendBackgroundMusicForAd = mod.suspendBackgroundMusicForAd
  resumeBackgroundMusicAfterAd = mod.resumeBackgroundMusicAfterAd
  suspendBackgroundMusicForSessionEnd = mod.suspendBackgroundMusicForSessionEnd
  resumeBackgroundMusicAfterSessionClaim = mod.resumeBackgroundMusicAfterSessionClaim
})

afterEach(() => {
  vi.unstubAllGlobals()
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

  describe('pausa e retomada durante anúncios', () => {
    it('pausa ao iniciar o anúncio e retoma ao encerrar quando não mutado', () => {
      renderHook(() => useBackgroundMusic())
      const audio = FakeAudio.instances[0]
      expect(audio).toBeDefined()
      expect(audio.paused).toBe(false)

      act(() => {
        suspendBackgroundMusicForAd()
      })

      expect(audio.paused).toBe(true)
      expect(audio.pauseCalls).toBeGreaterThan(0)
      // A preferência de mudo do usuário não é alterada.
      expect(localStorage.getItem('studyquest:bg-music-muted')).toBeNull()

      act(() => {
        resumeBackgroundMusicAfterAd()
      })

      expect(audio.paused).toBe(false)
    })

    it('permanece em silêncio quando o usuário já está mutado', () => {
      const { result } = renderHook(() => useBackgroundMusic())

      act(() => {
        result.current.mute()
      })

      expect(result.current.isMuted).toBe(true)
      const audio = FakeAudio.instances[0]
      const playCallsAfterMute = audio.playCalls

      act(() => {
        suspendBackgroundMusicForAd()
        resumeBackgroundMusicAfterAd()
      })

      // Não tenta retomar a reprodução: continua em silêncio.
      expect(audio.playCalls).toBe(playCallsAfterMute)
    })

    it('só retoma quando não há mais anúncios ativos (resiliência)', () => {
      renderHook(() => useBackgroundMusic())
      const audio = FakeAudio.instances[0]

      act(() => {
        suspendBackgroundMusicForAd()
        suspendBackgroundMusicForAd()
      })

      expect(audio.paused).toBe(true)

      act(() => {
        resumeBackgroundMusicAfterAd()
      })

      // Ainda há um anúncio ativo: permanece pausado.
      expect(audio.paused).toBe(true)

      act(() => {
        resumeBackgroundMusicAfterAd()
      })

      expect(audio.paused).toBe(false)
    })
  })

  describe('pausa e retomada na conclusão da sessão de foco', () => {
    it('pausa ao concluir a sessão e retoma após coletar quando não mutado', () => {
      renderHook(() => useBackgroundMusic())
      const audio = FakeAudio.instances[0]
      expect(audio.paused).toBe(false)

      act(() => {
        suspendBackgroundMusicForSessionEnd()
      })

      expect(audio.paused).toBe(true)
      expect(audio.pauseCalls).toBeGreaterThan(0)
      // A preferência de mudo do usuário não é alterada.
      expect(localStorage.getItem('studyquest:bg-music-muted')).toBeNull()

      act(() => {
        resumeBackgroundMusicAfterSessionClaim()
      })

      expect(audio.paused).toBe(false)
    })

    it('permanece em silêncio quando o usuário já está mutado', () => {
      const { result } = renderHook(() => useBackgroundMusic())

      act(() => {
        result.current.mute()
      })

      expect(result.current.isMuted).toBe(true)
      const audio = FakeAudio.instances[0]
      const playCallsAfterMute = audio.playCalls

      act(() => {
        suspendBackgroundMusicForSessionEnd()
        resumeBackgroundMusicAfterSessionClaim()
      })

      // Não tenta retomar a reprodução: continua em silêncio.
      expect(audio.playCalls).toBe(playCallsAfterMute)
    })

    it('não retoma por fim de anúncio enquanto a sessão ainda está pendente', () => {
      renderHook(() => useBackgroundMusic())
      const audio = FakeAudio.instances[0]

      act(() => {
        suspendBackgroundMusicForSessionEnd()
      })
      expect(audio.paused).toBe(true)

      // O anúncio terminou, mas as recompensas da sessão ainda não foram
      // coletadas: a música continua pausada.
      act(() => {
        resumeBackgroundMusicAfterAd()
      })
      expect(audio.paused).toBe(true)

      act(() => {
        resumeBackgroundMusicAfterSessionClaim()
      })
      expect(audio.paused).toBe(false)
    })

    it('não retoma por coleta enquanto um anúncio ainda está ativo', () => {
      renderHook(() => useBackgroundMusic())
      const audio = FakeAudio.instances[0]

      act(() => {
        suspendBackgroundMusicForAd()
        suspendBackgroundMusicForSessionEnd()
      })
      expect(audio.paused).toBe(true)

      // As recompensas foram coletadas, mas o anúncio ainda está na tela:
      // a música não deve voltar.
      act(() => {
        resumeBackgroundMusicAfterSessionClaim()
      })
      expect(audio.paused).toBe(true)

      act(() => {
        resumeBackgroundMusicAfterAd()
      })
      expect(audio.paused).toBe(false)
    })

    it('suporta múltiplas suspensões de sessão sem travar (resiliência)', () => {
      renderHook(() => useBackgroundMusic())
      const audio = FakeAudio.instances[0]

      act(() => {
        suspendBackgroundMusicForSessionEnd()
        suspendBackgroundMusicForSessionEnd()
      })
      expect(audio.paused).toBe(true)

      act(() => {
        resumeBackgroundMusicAfterSessionClaim()
      })
      // Ainda há uma sessão pendente.
      expect(audio.paused).toBe(true)

      act(() => {
        resumeBackgroundMusicAfterSessionClaim()
      })
      expect(audio.paused).toBe(false)
    })
  })
})
