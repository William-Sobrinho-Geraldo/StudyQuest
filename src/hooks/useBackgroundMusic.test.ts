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

/**
 * Ativa o som explicitamente (como o usuário faria ao tocar no toggle), para
 * que os testes de pausa/retomada de anúncio e sessão partam do estado ligado.
 */
function activate(result: { current: { setMuted: (muted: boolean) => void } }): void {
  act(() => {
    result.current.setMuted(false)
  })
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
  it('inicia mutado (OFF) sem preferência salva e não chama play() na montagem', () => {
    const { result } = renderHook(() => useBackgroundMusic())
    const audio = FakeAudio.instances[0]

    expect(result.current.tracks).toHaveLength(4)
    expect(result.current.trackId).toBe('focus')
    expect(result.current.currentTrackId).toBe('focus')
    expect(result.current.track.name).toBe('Foco Calmo')
    expect(result.current.isMuted).toBe(true)
    expect(result.current.muted).toBe(true)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.playing).toBe(false)

    expect(audio).toBeDefined()
    expect(audio.muted).toBe(true)
    expect(audio.paused).toBe(true)
    expect(audio.playCalls).toBe(0)
  })

  it('não inicia a reprodução em cliques genéricos na página enquanto está OFF', () => {
    renderHook(() => useBackgroundMusic())
    const audio = FakeAudio.instances[0]

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
      window.dispatchEvent(new Event('touchstart'))
      window.dispatchEvent(new Event('keydown'))
    })

    expect(audio.playCalls).toBe(0)
    expect(audio.paused).toBe(true)
    // A preferência só passa a existir quando o usuário ativa o som de fato.
    expect(localStorage.getItem('studyquest:bg-music-muted')).toBeNull()
  })

  it('ativa a reprodução ao alternar o toggle (OFF -> ON) e persiste a preferência', () => {
    const { result } = renderHook(() => useBackgroundMusic())
    const audio = FakeAudio.instances[0]

    expect(result.current.isMuted).toBe(true)

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isMuted).toBe(false)
    expect(result.current.muted).toBe(false)
    expect(result.current.isPlaying).toBe(true)
    expect(audio.paused).toBe(false)
    expect(audio.playCalls).toBeGreaterThan(0)
    expect(localStorage.getItem('studyquest:bg-music-muted')).toBe('false')
  })

  it('respeita a preferência salva como ativada ao recarregar', async () => {
    localStorage.setItem('studyquest:bg-music-muted', 'false')
    vi.resetModules()
    FakeAudio.instances = []
    const mod = await import('./useBackgroundMusic')

    const { result } = renderHook(() => mod.useBackgroundMusic())
    const audio = FakeAudio.instances[0]

    expect(result.current.isMuted).toBe(false)
    expect(result.current.muted).toBe(false)
    expect(result.current.isPlaying).toBe(true)
    expect(audio.paused).toBe(false)
    expect(audio.playCalls).toBeGreaterThan(0)
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

  it('alterna o estado de mudo e persiste a preferência (OFF -> ON -> OFF)', () => {
    const { result } = renderHook(() => useBackgroundMusic())

    expect(result.current.isMuted).toBe(true)

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isMuted).toBe(false)
    expect(result.current.muted).toBe(false)
    expect(localStorage.getItem('studyquest:bg-music-muted')).toBe('false')

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isMuted).toBe(true)
    expect(result.current.muted).toBe(true)
    expect(localStorage.getItem('studyquest:bg-music-muted')).toBe('true')
  })

  describe('pausa e retomada durante anúncios', () => {
    it('pausa ao iniciar o anúncio e retoma ao encerrar quando não mutado', () => {
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)
      const audio = FakeAudio.instances[0]
      expect(audio).toBeDefined()
      expect(audio.paused).toBe(false)

      act(() => {
        suspendBackgroundMusicForAd()
      })

      expect(audio.paused).toBe(true)
      expect(audio.pauseCalls).toBeGreaterThan(0)
      // A preferência de mudo do usuário não é alterada (segue ligada).
      expect(localStorage.getItem('studyquest:bg-music-muted')).toBe('false')

      act(() => {
        resumeBackgroundMusicAfterAd()
      })

      expect(audio.paused).toBe(false)
    })

    it('permanece em silêncio quando o usuário já está mutado', () => {
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)

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
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)
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
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)
      const audio = FakeAudio.instances[0]
      expect(audio.paused).toBe(false)

      act(() => {
        suspendBackgroundMusicForSessionEnd()
      })

      expect(audio.paused).toBe(true)
      expect(audio.pauseCalls).toBeGreaterThan(0)
      // A preferência de mudo do usuário não é alterada (segue ligada).
      expect(localStorage.getItem('studyquest:bg-music-muted')).toBe('false')

      act(() => {
        resumeBackgroundMusicAfterSessionClaim()
      })

      expect(audio.paused).toBe(false)
    })

    it('permanece em silêncio quando o usuário já está mutado', () => {
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)

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
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)
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
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)
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

    it('a pausa de sessão é auto-curável e não trava a música (resiliência)', () => {
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)
      const audio = FakeAudio.instances[0]

      act(() => {
        suspendBackgroundMusicForSessionEnd()
        suspendBackgroundMusicForSessionEnd()
      })
      expect(audio.paused).toBe(true)

      act(() => {
        resumeBackgroundMusicAfterSessionClaim()
      })
      // Um único claim limpa a pausa pendente (booleano idempotente).
      expect(audio.paused).toBe(false)

      // Chamadas extras são no-op e não deixam a música pausada.
      act(() => {
        resumeBackgroundMusicAfterSessionClaim()
      })
      expect(audio.paused).toBe(false)
    })

    it('unmute manual retoma a música mesmo com pausa de sessão pendente', () => {
      const { result } = renderHook(() => useBackgroundMusic())
      const audio = FakeAudio.instances[0]

      act(() => {
        suspendBackgroundMusicForSessionEnd()
      })
      expect(audio.paused).toBe(true)

      act(() => {
        result.current.setMuted(false)
      })

      expect(result.current.isMuted).toBe(false)
      expect(audio.paused).toBe(false)
    })

    it('o toggle retoma o som quando está ligado mas pausado (pausa residual)', () => {
      const { result } = renderHook(() => useBackgroundMusic())
      activate(result)
      const audio = FakeAudio.instances[0]

      act(() => {
        suspendBackgroundMusicForSessionEnd()
      })
      expect(result.current.isMuted).toBe(false)
      expect(audio.paused).toBe(true)

      act(() => {
        result.current.toggle()
      })

      // Continua sem mudo e volta a tocar, em vez de silenciar.
      expect(result.current.isMuted).toBe(false)
      expect(audio.paused).toBe(false)
    })
  })
})
