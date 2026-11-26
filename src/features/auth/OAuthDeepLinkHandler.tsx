import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { handleOAuthCallbackUrl } from './googleOAuth'

// Registra, em nível de aplicação, o tratamento do retorno do OAuth por deep
// link (`studyquest://auth/callback`) em builds nativas. Cobre tanto o retorno
// com o app já aberto (evento `appUrlOpen`) quanto a abertura a frio via link
// (`getLaunchUrl`). Sem efeito no navegador.
export function OAuthDeepLinkHandler() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let handle: { remove: () => void } | undefined
    let disposed = false

    CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      await Browser.close()
      await handleOAuthCallbackUrl(url)
    }).then((registered) => {
      if (disposed) {
        void registered.remove()
        return
      }
      handle = registered
    })

    // Cobre o caso de o app ter sido aberto a frio pelo deep link.
    void CapacitorApp.getLaunchUrl().then(async (launchUrl) => {
      if (launchUrl?.url) {
        await handleOAuthCallbackUrl(launchUrl.url)
      }
    })

    return () => {
      disposed = true
      handle?.remove()
    }
  }, [])

  return null
}
