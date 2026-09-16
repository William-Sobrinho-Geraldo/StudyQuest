import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { AdMob } from '@capacitor-community/admob'
import {
  registerOpenAppActionType,
  requestNotificationPermissions,
  setupAlarmNotificationChannels,
} from '../features/study/lib/distractionNotifications'

export async function initNativeApp(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#0f172a' })
  await AdMob.initialize()
  await requestNotificationPermissions()
  await setupAlarmNotificationChannels()
  await registerOpenAppActionType()
}
