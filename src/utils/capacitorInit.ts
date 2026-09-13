import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

export async function initNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#0f172a' })
  await SplashScreen.hide()
}
