import { useCallback, useEffect, useRef, useState } from 'react'
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob'
import type { PluginListenerHandle } from '@capacitor/core'

const adId = 'ca-app-pub-3940256099942544/5224354917'

export function useRewardedAd() {
  const [isAdReady, setIsAdReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const onSuccessRef = useRef<(() => void) | undefined>(undefined)

  const loadAd = useCallback(async () => {
    setIsLoading(true)
    try {
      await AdMob.prepareRewardVideoAd({ adId })
      setIsAdReady(true)
    } catch {
      setIsAdReady(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const handles: PluginListenerHandle[] = []

    void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      const handler = onSuccessRef.current
      onSuccessRef.current = undefined
      handler?.()
    }).then((handle) => {
      handles.push(handle)
    })

    void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      setIsAdReady(false)
      void loadAd()
    }).then((handle) => {
      handles.push(handle)
    })

    void loadAd()

    return () => {
      handles.forEach((handle) => {
        void handle.remove()
      })
    }
  }, [loadAd])

  const showAd = useCallback(async (onSuccess: () => void) => {
    onSuccessRef.current = onSuccess
    setIsAdReady(false)
    await AdMob.showRewardVideoAd()
  }, [])

  return { isAdReady, isLoading, showAd, loadAd }
}
