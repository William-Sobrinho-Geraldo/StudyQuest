import { describe, expect, it } from 'vitest'
import { formatCountdown, getTimeRemaining } from './countdown'

const NOW = new Date('2026-09-11T12:00:00.000Z').getTime()

describe('getTimeRemaining', () => {
  it('decompõe o tempo restante em dias, horas, minutos e segundos', () => {
    const target = new Date(NOW + (2 * 86_400 + 3 * 3_600 + 5 * 60 + 7) * 1000).toISOString()
    const remaining = getTimeRemaining(target, NOW)
    expect(remaining.days).toBe(2)
    expect(remaining.hours).toBe(3)
    expect(remaining.minutes).toBe(5)
    expect(remaining.seconds).toBe(7)
    expect(remaining.total).toBe((2 * 86_400 + 3 * 3_600 + 5 * 60 + 7) * 1000)
  })

  it('nunca retorna tempo negativo após o fim', () => {
    const target = new Date(NOW - 1000).toISOString()
    const remaining = getTimeRemaining(target, NOW)
    expect(remaining.total).toBe(0)
    expect(remaining.days).toBe(0)
    expect(remaining.hours).toBe(0)
    expect(remaining.minutes).toBe(0)
    expect(remaining.seconds).toBe(0)
  })
})

describe('formatCountdown', () => {
  it('formata em dias, horas e minutos quando falta mais de um dia', () => {
    const target = new Date(NOW + (2 * 86_400 + 3 * 3_600) * 1000).toISOString()
    expect(formatCountdown(target, NOW)).toBe('2d 3h 0m')
  })

  it('formata em horas, minutos e segundos quando falta menos de um dia', () => {
    const target = new Date(NOW + (3 * 3_600 + 5 * 60 + 7) * 1000).toISOString()
    expect(formatCountdown(target, NOW)).toBe('3h 5m 7s')
  })

  it('formata em minutos e segundos quando falta menos de uma hora', () => {
    const target = new Date(NOW + (5 * 60 + 7) * 1000).toISOString()
    expect(formatCountdown(target, NOW)).toBe('5m 7s')
  })

  it('formata apenas segundos quando falta menos de um minuto', () => {
    const target = new Date(NOW + 7 * 1000).toISOString()
    expect(formatCountdown(target, NOW)).toBe('7s')
  })

  it('retorna "Encerrada" após o fim', () => {
    const target = new Date(NOW - 1).toISOString()
    expect(formatCountdown(target, NOW)).toBe('Encerrada')
  })
})