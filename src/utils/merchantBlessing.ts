import { CHEST_MAX_GOLD, CHEST_MAX_XP } from './idleRewards'

export const MERCHANT_DAILY_LIMIT = 10
export const MERCHANT_BLESSING_XP = Math.floor(CHEST_MAX_XP * 0.1)
export const MERCHANT_BLESSING_GOLD = Math.floor(CHEST_MAX_GOLD * 0.1)

const SAO_PAULO_TIME_ZONE = 'America/Sao_Paulo'

export function getSaoPauloDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAO_PAULO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export interface MerchantAdCounter {
  daily_ad_views: number
  daily_ad_views_date: string | null
}

export function getDailyAdViews(
  profile: MerchantAdCounter | null | undefined,
  now: Date = new Date(),
): number {
  if (!profile) return 0
  if (profile.daily_ad_views_date !== getSaoPauloDateString(now)) return 0
  return profile.daily_ad_views
}
