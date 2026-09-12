import { describe, expect, it } from 'vitest'
import {
  forgeDurationSeconds,
  formatCountdown,
  formatDurationPreview,
} from './forgeTimers'

describe('forgeDurationSeconds', () => {
  it('segue a nova curva de tempo por nível de refino', () => {
    expect(forgeDurationSeconds(0)).toBe(5 * 60)
    expect(forgeDurationSeconds(1)).toBe(30 * 60)
    expect(forgeDurationSeconds(2)).toBe(2 * 60 * 60)
    expect(forgeDurationSeconds(3)).toBe(6 * 60 * 60)
    expect(forgeDurationSeconds(4)).toBe(12 * 60 * 60)
  })

  it('do +5 em diante usa 24 horas', () => {
    expect(forgeDurationSeconds(5)).toBe(24 * 60 * 60)
    expect(forgeDurationSeconds(9)).toBe(24 * 60 * 60)
    expect(forgeDurationSeconds(12)).toBe(24 * 60 * 60)
  })
})

describe('formatDurationPreview', () => {
  it('formata minutos e horas conforme a escala nova', () => {
    expect(formatDurationPreview(5 * 60)).toBe('5 min')
    expect(formatDurationPreview(30 * 60)).toBe('30 min')
    expect(formatDurationPreview(2 * 60 * 60)).toBe('2h')
    expect(formatDurationPreview(6 * 60 * 60)).toBe('6h')
    expect(formatDurationPreview(12 * 60 * 60)).toBe('12h')
    expect(formatDurationPreview(24 * 60 * 60)).toBe('24h')
  })
})

describe('formatCountdown', () => {
  it('formata horas, minutos e segundos', () => {
    expect(formatCountdown((3 * 3600 + 45 * 60 + 12) * 1000)).toBe('03h 45m 12s')
  })

  it('arredonda frações de segundo para cima (nunca mostra 00h 00m 00s antes de zerar)', () => {
    expect(formatCountdown(500)).toBe('00h 00m 01s')
    expect(formatCountdown(1)).toBe('00h 00m 01s')
  })

  it('não exibe valores negativos', () => {
    expect(formatCountdown(-5000)).toBe('00h 00m 00s')
  })
})
