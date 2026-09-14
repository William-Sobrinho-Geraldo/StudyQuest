import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { AdMob } from '@capacitor-community/admob'

export async function initNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#0f172a' })
  await AdMob.initialize()
}
