import { isAndroid } from '../utils/platform'

const MOCK_AD_DURATION_MS = 2500

export function showRewardedAd(): Promise<boolean> {
  if (!isAndroid()) return Promise.resolve(false)
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(true), MOCK_AD_DURATION_MS)
  })
}
