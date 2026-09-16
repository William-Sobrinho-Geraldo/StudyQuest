const MOCK_AD_DURATION_MS = 2500

export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(true), MOCK_AD_DURATION_MS)
  })
}
