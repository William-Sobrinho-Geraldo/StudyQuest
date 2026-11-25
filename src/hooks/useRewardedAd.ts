import { useCallback, useEffect, useRef, useState } from 'react'
import { AdMob, RewardAdPluginEvents } from '@capacitor-community/admob'
import type { PluginListenerHandle } from '@capacitor/core'
import { REWARDED_AD_UNIT_ID } from '../config/admob'
import { isAndroid } from '../utils/platform'
import {
  resumeBackgroundMusicAfterAd,
  suspendBackgroundMusicForAd,
} from './useBackgroundMusic'

const adId = REWARDED_AD_UNIT_ID

export function useRewardedAd() {
  const [isAdReady, setIsAdReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const onSuccessRef = useRef<(() => void) | undefined>(undefined)
  const onErrorRef = useRef<(() => void) | undefined>(undefined)

  const loadAd = useCallback(async () => {
    if (!isAndroid()) return
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
    if (!isAndroid()) return

    const handles: PluginListenerHandle[] = []

    // O anúncio começou a ser exibido: pausa a música de fundo para não
    // competir com o áudio do anúncio (sem alterar a preferência de mudo).
    void AdMob.addListener(RewardAdPluginEvents.Showed, () => {
      suspendBackgroundMusicForAd()
    }).then((handle) => {
      handles.push(handle)
    })

    // Única fonte de verdade para conceder a recompensa: o anúncio foi
    // assistido até o fim e o usuário ganhou a recompensa.
    void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
      const handler = onSuccessRef.current
      onSuccessRef.current = undefined
      onErrorRef.current = undefined
      handler?.()
    }).then((handle) => {
      handles.push(handle)
    })

    // Fechado sem concluir (ou apenas encerrado): nunca concede recompensa.
    void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
      resumeBackgroundMusicAfterAd()
      onSuccessRef.current = undefined
      onErrorRef.current = undefined
      setIsAdReady(false)
      void loadAd()
    }).then((handle) => {
      handles.push(handle)
    })

    // Anúncio carregado, mas falhou ao abrir: informa indisponibilidade e
    // recarrega sem conceder recompensa.
    void AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
      resumeBackgroundMusicAfterAd()
      const handler = onErrorRef.current
      onSuccessRef.current = undefined
      onErrorRef.current = undefined
      handler?.()
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

  const showAd = useCallback(
    async (onSuccess: () => void, onError?: () => void) => {
      if (!isAndroid()) return

      onSuccessRef.current = onSuccess
      onErrorRef.current = onError
      setIsAdReady(false)
      try {
        await AdMob.showRewardVideoAd()
      } catch (error) {
        // Falhou ao abrir (ex.: anúncio não preparado): garante que a música
        // não fique travada pausada, retomando se o usuário não estiver mutado.
        resumeBackgroundMusicAfterAd()
        console.error('Falha ao exibir o anúncio:', error)
        const handler = onErrorRef.current
        onSuccessRef.current = undefined
        onErrorRef.current = undefined
        handler?.()
        void loadAd()
      }
    },
    [loadAd],
  )

  return { isAdReady, isLoading, showAd, loadAd }
}
