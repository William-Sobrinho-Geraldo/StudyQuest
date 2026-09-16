type WindowWithAudio = Window & {
  webkitAudioContext?: typeof AudioContext
}

export type CompletionSoundKey =
  | 'crystal_bell'
  | 'victory_fanfare'
  | 'magic_harp'
  | 'war_gong'

export interface SoundOption {
  key: CompletionSoundKey
  emoji: string
  label: string
}

export const SOUND_OPTIONS: SoundOption[] = [
  { key: 'crystal_bell', emoji: '🔔', label: 'Sino de Cristal' },
  { key: 'victory_fanfare', emoji: '⚔️', label: 'Fanfarra de Vitória' },
  { key: 'magic_harp', emoji: '📜', label: 'Harpa Mágica' },
  { key: 'war_gong', emoji: '🛡️', label: 'Gongo de Combate' },
]

const DEFAULT_SOUND_KEY: CompletionSoundKey = 'crystal_bell'
const SOUND_STORAGE_KEY = 'studyquest:completion-sound'

function isCompletionSoundKey(value: string): value is CompletionSoundKey {
  return SOUND_OPTIONS.some((option) => option.key === value)
}

export function getSelectedSoundKey(): CompletionSoundKey {
  if (typeof window === 'undefined') return DEFAULT_SOUND_KEY
  const raw = window.localStorage.getItem(SOUND_STORAGE_KEY)
  if (raw !== null && isCompletionSoundKey(raw)) return raw
  return DEFAULT_SOUND_KEY
}

export function setSelectedSoundKey(key: CompletionSoundKey): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SOUND_STORAGE_KEY, key)
}

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioContextCtor =
    window.AudioContext ?? (window as WindowWithAudio).webkitAudioContext
  if (!AudioContextCtor) return null
  if (!audioContext) {
    audioContext = new AudioContextCtor()
  }
  return audioContext
}

function createMaster(context: AudioContext): GainNode {
  const master = context.createGain()
  master.gain.value = 0.9

  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -18
  compressor.knee.value = 20
  compressor.ratio.value = 12

  master.connect(compressor)
  compressor.connect(context.destination)
  return master
}

interface ToneOptions {
  type?: OscillatorType
  peak?: number
  decay?: number
  overtone?: number
  overtoneGain?: number
}

function scheduleTone(
  context: AudioContext,
  output: AudioNode,
  frequency: number,
  startAt: number,
  options: ToneOptions = {},
): void {
  const type = options.type ?? 'sine'
  const peak = options.peak ?? 0.5
  const decay = options.decay ?? 1.2

  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + decay)

  const oscillator = context.createOscillator()
  oscillator.type = type
  oscillator.frequency.value = frequency
  oscillator.connect(gain)

  if (options.overtone) {
    const overtoneGain = context.createGain()
    overtoneGain.gain.value = options.overtoneGain ?? 0.15
    const overtone = context.createOscillator()
    overtone.type = 'sine'
    overtone.frequency.value = frequency * options.overtone
    overtone.connect(overtoneGain)
    overtoneGain.connect(gain)
    overtone.start(startAt)
    overtone.stop(startAt + decay + 0.1)
  }

  gain.connect(output)
  oscillator.start(startAt)
  oscillator.stop(startAt + decay + 0.1)
}

function createNoiseBuffer(context: AudioContext): AudioBuffer {
  const length = Math.floor(context.sampleRate * 0.15)
  const buffer = context.createBuffer(1, length, context.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
  }
  return buffer
}

function scheduleNoiseStrike(
  context: AudioContext,
  output: AudioNode,
  startAt: number,
  peak = 0.4,
): void {
  const source = context.createBufferSource()
  source.buffer = createNoiseBuffer(context)
  const gain = context.createGain()
  gain.gain.setValueAtTime(peak, startAt)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.15)
  source.connect(gain)
  gain.connect(output)
  source.start(startAt)
}

function playCrystalBell(context: AudioContext, master: GainNode): void {
  const startAt = context.currentTime
  const melody = [523.25, 659.25, 783.99, 1046.5]
  melody.forEach((frequency, index) => {
    scheduleTone(context, master, frequency, startAt + index * 0.14, {
      type: 'triangle',
      peak: 0.6,
      decay: 1.3,
      overtone: 2,
      overtoneGain: 0.18,
    })
  })
}

function playVictoryFanfare(context: AudioContext, master: GainNode): void {
  const startAt = context.currentTime

  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1600
  filter.Q.value = 0.7
  filter.connect(master)

  const intro = [392, 523.25, 659.25]
  intro.forEach((frequency, index) => {
    scheduleTone(context, filter, frequency, startAt + index * 0.16, {
      type: 'sawtooth',
      peak: 0.3,
      decay: 0.4,
    })
  })

  scheduleTone(context, filter, 1046.5, startAt + 0.48, {
    type: 'sawtooth',
    peak: 0.35,
    decay: 1.4,
    overtone: 2,
    overtoneGain: 0.12,
  })
}

function playMagicHarp(context: AudioContext, master: GainNode): void {
  const startAt = context.currentTime
  const notes = [659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98]
  notes.forEach((frequency, index) => {
    scheduleTone(context, master, frequency, startAt + index * 0.07, {
      type: 'triangle',
      peak: 0.4,
      decay: 0.6,
      overtone: 2,
      overtoneGain: 0.1,
    })
  })
}

function playWarGong(context: AudioContext, master: GainNode): void {
  const startAt = context.currentTime
  const fundamental = 98

  scheduleNoiseStrike(context, master, startAt, 0.5)

  scheduleTone(context, master, fundamental, startAt, {
    type: 'sine',
    peak: 0.7,
    decay: 2.2,
  })

  const partials = [1.4, 2.1, 2.9, 3.7]
  partials.forEach((ratio, index) => {
    scheduleTone(context, master, fundamental * ratio, startAt, {
      type: 'sine',
      peak: 0.24,
      decay: 1.6 - index * 0.2,
    })
  })
}

const SYNTHS: Record<CompletionSoundKey, (context: AudioContext, master: GainNode) => void> = {
  crystal_bell: playCrystalBell,
  victory_fanfare: playVictoryFanfare,
  magic_harp: playMagicHarp,
  war_gong: playWarGong,
}

function playSoundByKey(key: CompletionSoundKey): void {
  const context = getAudioContext()
  if (!context) return
  if (context.state === 'suspended') {
    void context.resume()
  }
  const master = createMaster(context)
  SYNTHS[key](context, master)
}

export function playCompletionSound(): void {
  playSoundByKey(getSelectedSoundKey())
}

export function playPreviewSound(key: CompletionSoundKey): void {
  playSoundByKey(key)
}
