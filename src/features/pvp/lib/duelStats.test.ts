import { describe, expect, it } from 'vitest'
import { getDuelTitle, getWinRate } from './duelStats'

describe('getDuelTitle', () => {
  it('retorna Iniciante (slate) para menos de 5 vitórias', () => {
    expect(getDuelTitle(0)).toEqual({ label: 'Iniciante', className: 'text-slate-400' })
    expect(getDuelTitle(4)).toEqual({ label: 'Iniciante', className: 'text-slate-400' })
  })

  it('retorna Desafiante (azul) para 5 a 19 vitórias', () => {
    expect(getDuelTitle(5)).toEqual({ label: 'Desafiante', className: 'text-blue-400' })
    expect(getDuelTitle(19)).toEqual({ label: 'Desafiante', className: 'text-blue-400' })
  })

  it('retorna Gladiador do Foco (roxa) para 20 a 49 vitórias', () => {
    expect(getDuelTitle(20)).toEqual({ label: 'Gladiador do Foco', className: 'text-purple-400' })
    expect(getDuelTitle(49)).toEqual({ label: 'Gladiador do Foco', className: 'text-purple-400' })
  })

  it('retorna Lenda da Arena (dourada) para 50+ vitórias', () => {
    expect(getDuelTitle(50)).toEqual({ label: 'Lenda da Arena', className: 'text-amber-400' })
    expect(getDuelTitle(120)).toEqual({ label: 'Lenda da Arena', className: 'text-amber-400' })
  })
})

describe('getWinRate', () => {
  it('retorna 0 quando não há duelos', () => {
    expect(getWinRate(0, 0)).toBe(0)
  })

  it('calcula a porcentagem arredondada de vitórias', () => {
    expect(getWinRate(1, 3)).toBe(25)
    expect(getWinRate(2, 3)).toBe(40)
    expect(getWinRate(1, 1)).toBe(50)
    expect(getWinRate(3, 0)).toBe(100)
  })
})
