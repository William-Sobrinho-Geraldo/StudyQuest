import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showRewardedAd } from './AdService'

describe('AdService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
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
})
