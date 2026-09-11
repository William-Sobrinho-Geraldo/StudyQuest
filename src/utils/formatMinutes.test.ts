import { describe, expect, it } from 'vitest'
import { formatMinutes } from './formatMinutes'

describe('formatMinutes', () => {
  it('formata zero minutos', () => {
    expect(formatMinutes(0)).toBe('0 min')
  })

  it('formata valores negativos como zero', () => {
    expect(formatMinutes(-5)).toBe('0 min')
  })

  it('mantém minutos quando abaixo de uma hora', () => {
    expect(formatMinutes(45)).toBe('45 min')
  })

  it('formata horas exatas', () => {
    expect(formatMinutes(120)).toBe('2h')
  })

  it('combina horas e minutos', () => {
    expect(formatMinutes(90)).toBe('1h 30m')
  })
})