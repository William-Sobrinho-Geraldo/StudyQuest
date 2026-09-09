import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHEST_MAX_GOLD,
  CHEST_MAX_MINUTES,
  CHEST_MAX_XP,
  formatElapsedTime,
  getIdleRewards,
} from './idleRewards'

const NOW = new Date('2026-09-09T12:00:00.000Z')

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString()
}

describe('getIdleRewards', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('acumula zero quando nunca passou tempo (mesmo instante)', () => {
    expect(getIdleRewards(minutesAgo(0))).toEqual({
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      currentXp: 0,
      currentGold: 0,
      progressPercentage: 0,
    })
  })

  it('trata null como zero', () => {
    expect(getIdleRewards(null)).toEqual({
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      currentXp: 0,
      currentGold: 0,
      progressPercentage: 0,
    })
  })

  it('trata data futura como zero (evita tempo negativo)', () => {
    const future = new Date(NOW.getTime() + 60_000).toISOString()
    expect(getIdleRewards(future)).toEqual({
      elapsedMinutes: 0,
      elapsedSeconds: 0,
      currentXp: 0,
      currentGold: 0,
      progressPercentage: 0,
    })
  })

  it('a) retorno exato na metade do tempo (4 horas)', () => {
    const result = getIdleRewards(minutesAgo(240))

    expect(result.elapsedMinutes).toBe(240)
    expect(result.elapsedSeconds).toBe(14_400)
    expect(result.currentXp).toBe(500)
    expect(result.currentGold).toBe(150)
    expect(result.progressPercentage).toBe(50)
  })

  it('b) retorno exato no tempo máximo (8 horas)', () => {
    const result = getIdleRewards(minutesAgo(CHEST_MAX_MINUTES))

    expect(result.elapsedMinutes).toBe(CHEST_MAX_MINUTES)
    expect(result.elapsedSeconds).toBe(CHEST_MAX_MINUTES * 60)
    expect(result.currentXp).toBe(CHEST_MAX_XP)
    expect(result.currentGold).toBe(CHEST_MAX_GOLD)
    expect(result.progressPercentage).toBe(100)
  })

  it('c) bloqueia no limite máximo: 10 horas retornam o mesmo que 8 horas', () => {
    const atTenHours = getIdleRewards(minutesAgo(600))
    const atEightHours = getIdleRewards(minutesAgo(480))

    expect(atTenHours.elapsedMinutes).toBe(600)
    expect(atTenHours.elapsedSeconds).toBe(36_000)
    expect(atTenHours.currentXp).toBe(atEightHours.currentXp)
    expect(atTenHours.currentGold).toBe(atEightHours.currentGold)
    expect(atTenHours.progressPercentage).toBe(atEightHours.progressPercentage)
    expect(atTenHours.currentXp).toBe(CHEST_MAX_XP)
    expect(atTenHours.currentGold).toBe(CHEST_MAX_GOLD)
    expect(atTenHours.progressPercentage).toBe(100)
  })

  it('fica no teto mesmo acima de 8 horas (ex.: 24 horas)', () => {
    const result = getIdleRewards(minutesAgo(24 * 60))

    expect(result.currentXp).toBe(1000)
    expect(result.currentGold).toBe(300)
    expect(result.progressPercentage).toBe(100)
  })

  it('é estritamente proporcional em pontos intermediários (2 horas)', () => {
    const result = getIdleRewards(minutesAgo(120))

    expect(result.currentXp).toBe(250)
    expect(result.currentGold).toBe(75)
    expect(result.progressPercentage).toBe(25)
  })

  it('1 minuto acumulado gera o mínimo subsídio (floor, nunca arredonda para cima)', () => {
    const result = getIdleRewards(minutesAgo(1))

    expect(result.elapsedMinutes).toBe(1)
    expect(result.elapsedSeconds).toBe(60)
    expect(result.currentXp).toBe(Math.floor((1 / 480) * 1000))
    expect(result.currentGold).toBe(Math.floor((1 / 480) * 300))
    expect(result.progressPercentage).toBe(0)
  })

  it('arredonda para baixo na borda do teto (8h - 1min)', () => {
    const result = getIdleRewards(minutesAgo(479))

    expect(result.currentXp).toBe(Math.floor((479 / 480) * 1000))
    expect(result.currentGold).toBe(Math.floor((479 / 480) * 300))
    expect(result.progressPercentage).toBe(Math.floor((479 / 480) * 100))
  })

  it('1 minuto acima do teto continua 100%', () => {
    const result = getIdleRewards(minutesAgo(481))

    expect(result.currentXp).toBe(1000)
    expect(result.currentGold).toBe(300)
    expect(result.progressPercentage).toBe(100)
  })
})

describe('formatElapsedTime', () => {
  it('formata segundos abaixo de um minuto', () => {
    expect(formatElapsedTime(0)).toBe('0s')
    expect(formatElapsedTime(59)).toBe('59s')
  })

  it('formata a casa de minutos', () => {
    expect(formatElapsedTime(60)).toBe('1m 0s')
    expect(formatElapsedTime(61)).toBe('1m 1s')
    expect(formatElapsedTime(3599)).toBe('59m 59s')
  })

  it('formata a casa de horas', () => {
    expect(formatElapsedTime(3600)).toBe('1h 0m 0s')
    expect(formatElapsedTime(3661)).toBe('1h 1m 1s')
    expect(formatElapsedTime(28_800)).toBe('8h 0m 0s')
    expect(formatElapsedTime(36_000)).toBe('10h 0m 0s')
  })

  it('ignora valores negativos e arredonda para baixo', () => {
    expect(formatElapsedTime(-5)).toBe('0s')
    expect(formatElapsedTime(90.9)).toBe('1m 30s')
  })
})