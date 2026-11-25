import { useCallback, useSyncExternalStore } from 'react'
import {
  BACKGROUND_MUSIC_TRACKS,
  DEFAULT_TRACK_ID,
  getTrackById,
  resolveTrackId,
  type BackgroundMusicTrack,
} from '../lib/backgroundMusicTracks'

const STORAGE_KEY = 'studyquest:bg-music-muted'
const TRACK_STORAGE_KEY = 'studyquest:bg-music-track'
const DEFAULT_MUTED = false
const VOLUME = 0.25

type Listener = () => void

const listeners = new Set<Listener>()

let mutedState = DEFAULT_MUTED
let trackState = DEFAULT_TRACK_ID
let audioEl: HTMLAudioElement | null = null
let retryRegistered = false
// Quantos anúncios estão atualmente exibindo e suspenderam a música. É usado
// como contador (em vez de booleano) para absorver callbacks duplicados ou fora
// de ordem: a música só retoma quando não há mais nenhum anúncio ativo.
let adSuspendCount = 0
// `true` enquanto uma sessão de foco concluída aguarda coleta de recompensas.
// É um booleano (não contador) para ser auto-curável: ao coletar/reiniciar a
// sessão a pausa é simplesmente limpa, evitando que um callback perdido deixe a
// música travada pausada permanentemente.
let sessionEndPaused = false

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

function readTrack(): string {
  if (typeof window === 'undefined') return DEFAULT_TRACK_ID
  try {
    return resolveTrackId(window.localStorage.getItem(TRACK_STORAGE_KEY))
  } catch {
    return DEFAULT_TRACK_ID
  }
}

function writeTrack(id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(TRACK_STORAGE_KEY, id)
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
  // Nunca retomar por conta própria enquanto houver um bloqueio ativo: um
  // anúncio em exibição ou uma sessão concluída aguardando coleta de
  // recompensas. Isso cobre visibilitychange, appStateChange, gesture-retry e
  // retomada após anúncio.
  if (adSuspendCount > 0 || sessionEndPaused) return
  startPlayback(registerRetry)
}

/**
 * Inicia a reprodução de fato. Usado tanto pela retomada automática (que
 * respeita os bloqueios) quanto pela ação explícita do usuário.
 */
function startPlayback(registerRetry: boolean): void {
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
 * Retomada explícita (ex.: usuário desmutou pelo botão). Ignora pausas
 * automáticas temporárias — inclusive um contador de anúncio residual — para
 * que o controle de som nunca fique "morto". O botão não fica acessível
 * enquanto um anúncio em tela cheia está exibindo, então é seguro.
 */
function forcePlay(): void {
  startPlayback(true)
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
    const track = getTrackById(trackState) ?? getTrackById(DEFAULT_TRACK_ID)
    const audio = new Audio(track?.src)
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

/**
 * Pausa a música porque um anúncio começou a ser exibido. NÃO altera a
 * preferência de mudo do usuário (`mutedState`/localStorage): apenas interrompe
 * a reprodução momentaneamente, para não competir com o áudio do anúncio.
 */
export function suspendBackgroundMusicForAd(): void {
  adSuspendCount += 1
  if (audioEl) {
    audioEl.pause()
  }
}

/**
 * Sinaliza o fim (concluído, fechado/dispensado ou falha) de um anúncio e
 * retoma a música somente quando não houver mais nenhum anúncio ativo e o
 * usuário não estiver com o som mutado. Usa `tryPlay` para tratar de forma
 * segura a política de autoplay do WebView (agendando retry no próximo gesto
 * quando necessário).
 */
export function resumeBackgroundMusicAfterAd(): void {
  adSuspendCount = Math.max(0, adSuspendCount - 1)
  if (adSuspendCount === 0) {
    tryPlay(true)
  }
}

/**
 * Pausa a música porque uma sessão de foco terminou e o modal de recompensas
 * está prestes a ser exibido. NÃO altera a preferência de mudo do usuário
 * (`mutedState`/localStorage): apenas interrompe a reprodução momentaneamente
 * para que o som de conclusão toque com clareza.
 */
export function suspendBackgroundMusicForSessionEnd(): void {
  sessionEndPaused = true
  if (audioEl) {
    audioEl.pause()
  }
}

/**
 * Libera a suspensão de uma sessão concluída (após coletar as recompensas, ou
 * ao cancelar/reiniciar a sessão). Limpa o estado de pausa de forma idempotente
 * e só retoma quando não há anúncio ativo e o usuário não está mutado.
 */
export function resumeBackgroundMusicAfterSessionClaim(): void {
  // Sem pausa pendente não há nada a retomar: evita tentar tocar a música em
  // fluxos que nunca a pausaram (ex.: abandono antes de 1 minuto, unmount).
  if (!sessionEndPaused) return
  sessionEndPaused = false
  tryPlay(true)
}

function setMuted(next: boolean): void {
  mutedState = next
  writeMuted(next)
  if (audioEl) {
    audioEl.muted = next
    if (next) {
      audioEl.pause()
    } else {
      // Ação explícita do usuário: limpa a pausa de fim de sessão e força a
      // retomada, mesmo que exista algum bloqueio residual. Isso garante que o
      // botão de som no topo sempre volte a ativar a música.
      sessionEndPaused = false
      forcePlay()
    }
  }
  listeners.forEach((listener) => listener())
}

function setTrack(nextId: string): void {
  const track = getTrackById(nextId)
  if (!track || track.id === trackState) return
  trackState = track.id
  writeTrack(track.id)
  if (audioEl) {
    audioEl.src = track.src
    audioEl.loop = true
    audioEl.load()
    if (!mutedState) {
      tryPlay(true)
    }
  }
  listeners.forEach((listener) => listener())
}

function toggleMuted(): void {
  // Toggle inteligente: se a música ficou "ligada" mas pausada pela conclusão
  // da sessão (pausa residual), o toque do usuário deve RETOMAR o som — não
  // silenciá-lo. Em qualquer outro caso, alterna o mudo normalmente.
  if (!mutedState && sessionEndPaused) {
    sessionEndPaused = false
    forcePlay()
    return
  }
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

function getTrackSnapshot(): string {
  return trackState
}

function getTrackServerSnapshot(): string {
  return DEFAULT_TRACK_ID
}

// Initialise state from persisted preference as soon as the module loads in a
// browser environment, so the first render already reflects the user's choice.
if (typeof window !== 'undefined') {
  mutedState = readMuted()
  trackState = readTrack()
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
  /** Currently selected track. */
  track: BackgroundMusicTrack
  /** All available tracks. */
  tracks: BackgroundMusicTrack[]
  /** Id of the currently selected track. */
  trackId: string
  currentTrackId: string
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
  /** Select a track by id (no-op for invalid ids). */
  setTrack: (trackId: string) => void
  selectTrack: (trackId: string) => void
}

export function useBackgroundMusic(): UseBackgroundMusicResult {
  ensureAudio()

  const muted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const trackId = useSyncExternalStore(subscribe, getTrackSnapshot, getTrackServerSnapshot)
  const track = getTrackById(trackId) ?? getTrackById(DEFAULT_TRACK_ID) ?? BACKGROUND_MUSIC_TRACKS[0]

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

  const setTrackCallback = useCallback((id: string) => {
    setTrack(id)
  }, [])

  return {
    audioRef: { current: audioEl },
    audio: audioEl,
    isMuted: muted,
    muted,
    isPlaying: !muted,
    playing: !muted,
    volume: VOLUME,
    track,
    tracks: BACKGROUND_MUSIC_TRACKS,
    trackId,
    currentTrackId: trackId,
    toggle,
    toggleMute: toggle,
    toggleMusic: toggle,
    setMuted: setMutedCallback,
    mute,
    unmute,
    play,
    pause,
    setTrack: setTrackCallback,
    selectTrack: setTrackCallback,
  }
}
