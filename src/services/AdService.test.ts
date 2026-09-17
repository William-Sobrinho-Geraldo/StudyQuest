import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showRewardedAd } from './AdService'

const platformMocks = vi.hoisted(() => ({ isAndroid: true }))

vi.mock('../utils/platform', () => ({
  isAndroid: () => platformMocks.isAndroid,
}))

describe('AdService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    platformMocks.isAndroid = true
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolve true após o tempo simulado do anúncio', async () => {
    const promise = showRewardedAd()
    const assertion = expect(promise).resolves.toBe(true)

    await vi.advanceTimersByTimeAsync(2500)
    await assertion
  })

  it('retorna false imediatamente fora do Android', async () => {
    platformMocks.isAndroid = false

    await expect(showRewardedAd()).resolves.toBe(false)
  })
})
