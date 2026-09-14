import { useCallback, useEffect, useRef, useState } from 'react'
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

const adId = 'ca-app-pub-3940256099942544/5224354917'

const isNative = Capacitor.isNativePlatform()

export function useRewardedAd() {
  const [isAdReady, setIsAdReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const onSuccessRef = useRef<(() => void) | undefined>(undefined)

  const loadAd = useCallback(async () => {
    if (!isNative) return
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
    if (!isNative) return

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
    if (!isNative) return

    onSuccessRef.current = onSuccess
    setIsAdReady(false)
    try {
      await AdMob.showRewardVideoAd()
    } catch (error) {
      console.error('Falha ao exibir o anúncio:', error)
      const handler = onSuccessRef.current
      onSuccessRef.current = undefined
      handler?.()
    }
  }, [])

  return { isAdReady, isLoading, showAd, loadAd }
}
