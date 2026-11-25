import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRewardedAd } from './useRewardedAd'

const admobMock = vi.hoisted(() => ({
  prepareRewardVideoAd: vi.fn(),
  showRewardVideoAd: vi.fn(),
  addListener: vi.fn(),
}))

const bgMusicMock = vi.hoisted(() => ({
  suspendBackgroundMusicForAd: vi.fn(),
  resumeBackgroundMusicAfterAd: vi.fn(),
}))

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    prepareRewardVideoAd: admobMock.prepareRewardVideoAd,
    showRewardVideoAd: admobMock.showRewardVideoAd,
    addListener: admobMock.addListener,
  },
  RewardAdPluginEvents: {
    Loaded: 'onRewardedVideoAdLoaded',
    FailedToLoad: 'onRewardedVideoAdFailedToLoad',
    Showed: 'onRewardedVideoAdShowed',
    FailedToShow: 'onRewardedVideoAdFailedToShow',
    Dismissed: 'onRewardedVideoAdDismissed',
    Rewarded: 'onRewardedVideoAdReward',
    AdImpression: 'onRewardedVideoAdImpression',
  },
}))

vi.mock('./useBackgroundMusic', () => ({
  suspendBackgroundMusicForAd: bgMusicMock.suspendBackgroundMusicForAd,
  resumeBackgroundMusicAfterAd: bgMusicMock.resumeBackgroundMusicAfterAd,
}))

vi.mock('../utils/platform', () => ({
  isAndroid: () => true,
  getPlatform: () => 'android',
}))

const listeners = new Map<string, () => void>()

function emit(event: string): void {
  listeners.get(event)?.()
}

function renderAdHook() {
  return renderHook(() => useRewardedAd())
}

describe('useRewardedAd', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listeners.clear()
    admobMock.prepareRewardVideoAd.mockResolvedValue({ adUnitId: 'test-ad' })
    admobMock.showRewardVideoAd.mockResolvedValue({ type: '', amount: 0 })
    admobMock.addListener.mockImplementation((eventName: string, fn: () => void) => {
      listeners.set(eventName, fn)
      return Promise.resolve({ remove: vi.fn() })
    })
  })

  it('pré-carrega o anúncio e o marca como pronto', async () => {
    const { result } = renderAdHook()

    await waitFor(() => expect(result.current.isAdReady).toBe(true))
    expect(admobMock.prepareRewardVideoAd).toHaveBeenCalledTimes(1)
  })

  it('concede a recompensa apenas quando o evento Rewarded é disparado', async () => {
    const { result } = renderAdHook()
    await waitFor(() => expect(result.current.isAdReady).toBe(true))

    const onSuccess = vi.fn()
    const onError = vi.fn()

    await act(async () => {
      await result.current.showAd(onSuccess, onError)
    })

    // A exibição foi iniciada, mas sem o evento de recompensa nada é concedido.
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()

    act(() => {
      emit('onRewardedVideoAdReward')
    })

    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(onError).not.toHaveBeenCalled()
  })

  it('NÃO concede recompensa e chama onError quando a exibição falha', async () => {
    admobMock.showRewardVideoAd.mockRejectedValueOnce(new Error('sem anúncio preparado'))
    const { result } = renderAdHook()
    await waitFor(() => expect(result.current.isAdReady).toBe(true))

    const onSuccess = vi.fn()
    const onError = vi.fn()

    await act(async () => {
      await result.current.showAd(onSuccess, onError)
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    // Tenta recarregar após a falha.
    await waitFor(() => expect(admobMock.prepareRewardVideoAd).toHaveBeenCalledTimes(2))
  })

  it('NÃO concede recompensa quando o anúncio é fechado sem concluir', async () => {
    const { result } = renderAdHook()
    await waitFor(() => expect(result.current.isAdReady).toBe(true))

    const onSuccess = vi.fn()
    const onError = vi.fn()

    await act(async () => {
      await result.current.showAd(onSuccess, onError)
    })

    act(() => {
      emit('onRewardedVideoAdDismissed')
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    // Recarrega para a próxima tentativa.
    await waitFor(() => expect(admobMock.prepareRewardVideoAd).toHaveBeenCalledTimes(2))
  })

  it('NÃO concede recompensa e chama onError no evento FailedToShow', async () => {
    const { result } = renderAdHook()
    await waitFor(() => expect(result.current.isAdReady).toBe(true))

    const onSuccess = vi.fn()
    const onError = vi.fn()

    await act(async () => {
      await result.current.showAd(onSuccess, onError)
    })

    act(() => {
      emit('onRewardedVideoAdFailedToShow')
    })

    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledTimes(1)
    // Recarrega após a falha de exibição.
    await waitFor(() => expect(admobMock.prepareRewardVideoAd).toHaveBeenCalledTimes(2))
  })

  it('pausa a música quando o anúncio começa a ser exibido (Showed)', async () => {
    const { result } = renderAdHook()
    await waitFor(() => expect(result.current.isAdReady).toBe(true))

    act(() => {
      emit('onRewardedVideoAdShowed')
    })

    expect(bgMusicMock.suspendBackgroundMusicForAd).toHaveBeenCalledTimes(1)
    expect(bgMusicMock.resumeBackgroundMusicAfterAd).not.toHaveBeenCalled()
  })

  it('retoma a música ao fechar o anúncio (Dismissed)', async () => {
    const { result } = renderAdHook()
    await waitFor(() => expect(result.current.isAdReady).toBe(true))

    act(() => {
      emit('onRewardedVideoAdShowed')
      emit('onRewardedVideoAdDismissed')
    })

    expect(bgMusicMock.suspendBackgroundMusicForAd).toHaveBeenCalledTimes(1)
    expect(bgMusicMock.resumeBackgroundMusicAfterAd).toHaveBeenCalledTimes(1)

    // Flush do recarregamento assíncrono disparado pelo Dismissed.
    await waitFor(() => expect(admobMock.prepareRewardVideoAd).toHaveBeenCalledTimes(2))
  })

  it('retoma a música quando o anúncio falha ao abrir (FailedToShow)', async () => {
    const { result } = renderAdHook()
    await waitFor(() => expect(result.current.isAdReady).toBe(true))

    act(() => {
      emit('onRewardedVideoAdFailedToShow')
    })

    expect(bgMusicMock.resumeBackgroundMusicAfterAd).toHaveBeenCalledTimes(1)

    // Flush do recarregamento assíncrono disparado pelo FailedToShow.
    await waitFor(() => expect(admobMock.prepareRewardVideoAd).toHaveBeenCalledTimes(2))
  })

  it('retoma a música quando showRewardVideoAd rejeita (falha ao abrir)', async () => {
    admobMock.showRewardVideoAd.mockRejectedValueOnce(new Error('sem anúncio preparado'))
    const { result } = renderAdHook()
    await waitFor(() => expect(result.current.isAdReady).toBe(true))

    await act(async () => {
      await result.current.showAd(vi.fn(), vi.fn())
    })

    expect(bgMusicMock.resumeBackgroundMusicAfterAd).toHaveBeenCalledTimes(1)
  })
})
