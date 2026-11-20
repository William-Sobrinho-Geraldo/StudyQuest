import { useCallback, useSyncExternalStore } from 'react'
import audioSrc from '../assets/audio/bg-music.mp3'

const STORAGE_KEY = 'studyquest:bg-music-muted'
const DEFAULT_MUTED = false
const VOLUME = 0.25

type Listener = () => void

const listeners = new Set<Listener>()

let mutedState = DEFAULT_MUTED
let audioEl: HTMLAudioElement | null = null
let retryRegistered = false

function readMuted(): boolean {
  if (typeof window === 'undefined') return DEFAULT_MUTED
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return DEFAULT_MUTED
    return raw === 'true'
  } catch {
    return DEFAULT_MUTED
  }
}

function writeMuted(value: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // ignore
  }
}

/**
 * Tenta iniciar a reprodução de forma segura. `HTMLMediaElement.play()` pode
 * retornar `undefined` em alguns ambientes (ex.: jsdom) ou uma Promise que é
 * rejeitada quando o autoplay com som é bloqueado (browsers/WebView). Quando a
 * reprodução é bloqueada, agenda um retry para o próximo gesto do usuário.
 */
function tryPlay(registerRetry = true): void {
  if (!audioEl || mutedState) return
  try {
    const result = audioEl.play()
    if (result && typeof result.then === 'function') {
      result.catch(() => {
        if (registerRetry) registerGestureRetry()
      })
    }
  } catch {
    if (registerRetry) registerGestureRetry()
  }
}

/**
 * Registra (uma única vez) listeners de interação para contornar a política de
 * autoplay: assim que houver um gesto do usuário (toque/clique/tecla) e a
 * música não estiver silenciada, tenta iniciar a reprodução novamente.
 */
function registerGestureRetry(): void {
  if (typeof window === 'undefined' || retryRegistered) return
  retryRegistered = true

  const handler = (): void => {
    if (audioEl && !mutedState) {
      tryPlay(true)
    }
  }

  window.addEventListener('pointerdown', handler, { capture: true })
  window.addEventListener('touchstart', handler, { capture: true })
  window.addEventListener('keydown', handler, { capture: true })
}

function ensureAudio(): void {
  if (typeof window === 'undefined') return
  if (audioEl) return
  try {
    const audio = new Audio(audioSrc)
    audio.loop = true
    audio.volume = VOLUME
    audio.muted = mutedState
    audio.preload = 'auto'
    audioEl = audio
    if (!mutedState) {
      tryPlay(true)
    }
  } catch {
    audioEl = null
  }
}

function setMuted(next: boolean): void {
  mutedState = next
  writeMuted(next)
  if (audioEl) {
    audioEl.muted = next
    if (next) {
      audioEl.pause()
    } else {
      tryPlay(true)
    }
  }
  listeners.forEach((listener) => listener())
}

function toggleMuted(): void {
  setMuted(!mutedState)
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): boolean {
  return mutedState
}

function getServerSnapshot(): boolean {
  return DEFAULT_MUTED
}

// Initialise state from persisted preference as soon as the module loads in a
// browser environment, so the first render already reflects the user's choice.
if (typeof window !== 'undefined') {
  mutedState = readMuted()
  ensureAudio()

  // A música NÃO é pausada ao ir para segundo plano: o WebView continua ativo
  // (Capacitor `KeepRunning=true`) e o serviço em primeiro plano da sessão de
  // foco mantém a CPU acordada, então o HTMLAudioElement segue tocando. Aqui
  // apenas recuperamos a reprodução ao retornar ao foreground, caso o SO ou a
  // política de autoplay a tenha interrompido.
  const handleVisibilityChange = (): void => {
    if (!audioEl || mutedState || document.hidden) return
    tryPlay(true)
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  void import('@capacitor/app')
    .then(({ App }) => {
      void App.addListener('appStateChange', (state) => {
        if (!audioEl || mutedState || !state.isActive) return
        tryPlay(true)
      })
    })
    .catch(() => {
      // Capacitor not available (web/dev) - visibilitychange already covers it.
    })
}

export interface UseBackgroundMusicResult {
  /** Ref-like handle to the underlying audio element (may be null in SSR). */
  audioRef: { current: HTMLAudioElement | null }
  /** Underlying audio element. */
  audio: HTMLAudioElement | null
  /** Whether audio is currently muted. */
  isMuted: boolean
  muted: boolean
  /** Whether audio is currently playing (i.e. not muted). */
  isPlaying: boolean
  playing: boolean
  volume: number
  /** Toggle mute state. */
  toggle: () => void
  toggleMute: () => void
  toggleMusic: () => void
  /** Set mute state explicitly. */
  setMuted: (muted: boolean) => void
  mute: () => void
  unmute: () => void
  play: () => Promise<void> | undefined
  pause: () => void
}

export function useBackgroundMusic(): UseBackgroundMusicResult {
  ensureAudio()

  const muted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const toggle = useCallback(() => {
    toggleMuted()
  }, [])

  const setMutedCallback = useCallback((value: boolean) => {
    setMuted(value)
  }, [])

  const mute = useCallback(() => setMuted(true), [])
  const unmute = useCallback(() => setMuted(false), [])

  const play = useCallback(() => {
    if (!audioEl || mutedState) return undefined
    try {
      return audioEl.play()
    } catch {
      return undefined
    }
  }, [])

  const pause = useCallback(() => {
    audioEl?.pause()
  }, [])

  return {
    audioRef: { current: audioEl },
    audio: audioEl,
    isMuted: muted,
    muted,
    isPlaying: !muted,
    playing: !muted,
    volume: VOLUME,
    toggle,
    toggleMute: toggle,
    toggleMusic: toggle,
    setMuted: setMutedCallback,
    mute,
    unmute,
    play,
    pause,
  }
}
