import { describe, expect, it } from 'vitest'
import {
  getDailyAdViews,
  getSaoPauloDateString,
  MERCHANT_BLESSING_GOLD,
  MERCHANT_BLESSING_XP,
  MERCHANT_DAILY_LIMIT,
} from './merchantBlessing'

describe('merchantBlessing', () => {
  it('calcula 10% de um baú cheio', () => {
    expect(MERCHANT_BLESSING_XP).toBe(100)
    expect(MERCHANT_BLESSING_GOLD).toBe(30)
    expect(MERCHANT_DAILY_LIMIT).toBe(10)
  })

  it('formata a data no fuso de São Paulo', () => {
    expect(getSaoPauloDateString(new Date('2026-09-09T12:00:00.000Z'))).toBe('2026-09-09')
  })

  it('zera o contador quando a data salva não é a de hoje', () => {
    const now = new Date('2026-09-09T12:00:00.000Z')
    const today = getSaoPauloDateString(now)

    expect(getDailyAdViews({ daily_ad_views: 5, daily_ad_views_date: today }, now)).toBe(5)
    expect(getDailyAdViews({ daily_ad_views: 5, daily_ad_views_date: '2026-09-08' }, now)).toBe(0)
    expect(getDailyAdViews(null, now)).toBe(0)
    expect(getDailyAdViews(undefined, now)).toBe(0)
  })
})
