import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCachedDailyQuote,
  getCachedDailyQuote,
  getTodayLocalKey,
  saveCachedDailyQuote,
} from './quoteCache'
import type { MotivationalQuote } from '../services/quoteService'

const QUOTE: MotivationalQuote = {
  id: 'quote-1',
  content: 'A vitória pertence aos mais perseverantes.',
  author: 'Napoleão Bonaparte',
  category: 'Militar',
}

describe('quoteCache', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('retorna null quando não há frase em cache', () => {
    expect(getCachedDailyQuote('user-123')).toBeNull()
  })

  it('salva e lê uma frase para o usuário no dia atual', () => {
    saveCachedDailyQuote('user-123', QUOTE)

    expect(getCachedDailyQuote('user-123')).toEqual(QUOTE)
  })

  it('isola o cache por usuário', () => {
    saveCachedDailyQuote('user-123', QUOTE)

    expect(getCachedDailyQuote('user-456')).toBeNull()
  })

  it('descarta dados corrompidos no storage', () => {
    const key = `studyquest:daily_quote:v1:user-123:${getTodayLocalKey()}`
    window.localStorage.setItem(key, 'not-json')

    expect(getCachedDailyQuote('user-123')).toBeNull()
  })

  it('limpa frases de dias anteriores ao salvar a frase do dia', () => {
    window.localStorage.setItem('studyquest:daily_quote:v1:user-123:2026-01-01', '{"quote":{"id":"old"}}')
    saveCachedDailyQuote('user-123', QUOTE)

    expect(window.localStorage.getItem('studyquest:daily_quote:v1:user-123:2026-01-01')).toBeNull()
    expect(getCachedDailyQuote('user-123')).toEqual(QUOTE)
  })

  it('limpa todas as frases cacheadas de um usuário', () => {
    saveCachedDailyQuote('user-123', QUOTE)
    clearCachedDailyQuote('user-123')

    expect(getCachedDailyQuote('user-123')).toBeNull()
  })
})