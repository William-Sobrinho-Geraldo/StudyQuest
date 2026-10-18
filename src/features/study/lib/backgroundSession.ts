import { Capacitor } from '@capacitor/core'
import {
  ForegroundService,
  Importance,
  type StartForegroundServiceOptions,
} from '@capawesome-team/capacitor-android-foreground-service'
import { BatteryOptimization } from '@capawesome-team/capacitor-android-battery-optimization'

export const FOCUS_SERVICE_NOTIFICATION_ID = 49300
export const FOCUS_SERVICE_CHANNEL_ID = 'focus_session_v1'
export const FOCUS_SERVICE_ICON = 'ic_stat_studyquest'
export const BATTERY_OPTIMIZATION_PROMPT_KEY = 'studyquest:battery-optimization-prompt-shown'

let channelReady = false
let serviceRunning = false

function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android'
}

async function ensureFocusChannel(): Promise<void> {
  if (channelReady) return
  channelReady = true
  try {
    await ForegroundService.createNotificationChannel({
      id: FOCUS_SERVICE_CHANNEL_ID,
      name: 'Sessão de foco em andamento',
      description: 'Mantém o StudyQuest ativo para disparar o alarme com a tela bloqueada.',
      importance: Importance.Low,
    })
  } catch (error) {
    channelReady = false
    console.warn('Não foi possível criar o canal do serviço de foco:', error)
  }
}

export async function setupFocusServiceChannel(): Promise<void> {
  if (!isAndroid()) return
  await ensureFocusChannel()
}

function focusServiceOptions(): StartForegroundServiceOptions {
  return {
    id: FOCUS_SERVICE_NOTIFICATION_ID,
    title: 'Sessão de foco em andamento',
    body: 'Mantenha o StudyQuest ativo para não perder o seu progresso de XP.',
    smallIcon: FOCUS_SERVICE_ICON,
    silent: true,
    notificationChannelId: FOCUS_SERVICE_CHANNEL_ID,
  }
}

/**
 * Starts a foreground service for the duration of a focus session so the OS
 * (especially on aggressive OEMs like MIUI/One UI) does not kill the process
 * and clear the exact alarm scheduled for the session completion.
 */
export async function startFocusForegroundService(): Promise<void> {
  if (!isAndroid()) return
  try {
    await ensureFocusChannel()
    const options = focusServiceOptions()
    if (serviceRunning) {
      await ForegroundService.updateForegroundService(options)
    } else {
      await ForegroundService.startForegroundService(options)
      serviceRunning = true
    }
  } catch (error) {
    serviceRunning = false
    console.warn('Não foi possível iniciar o serviço de foco:', error)
  }
}

export async function stopFocusForegroundService(): Promise<void> {
  if (!isAndroid()) return
  try {
    await ForegroundService.stopForegroundService()
  } catch (error) {
    console.warn('Não foi possível parar o serviço de foco:', error)
  } finally {
    serviceRunning = false
  }
}

export function isFocusForegroundServiceRunning(): boolean {
  return serviceRunning
}

/**
 * Returns true when Android is free to restrict the app in the background
 * (battery optimization enabled). The alarm is only guaranteed when this
 * returns false.
 */
export async function isBatteryOptimizationEnabled(): Promise<boolean> {
  if (!isAndroid()) return false
  try {
    const { enabled } = await BatteryOptimization.isBatteryOptimizationEnabled()
    return enabled
  } catch {
    return false
  }
}

export async function requestIgnoreBatteryOptimization(): Promise<void> {
  if (!isAndroid()) return
  try {
    await BatteryOptimization.requestIgnoreBatteryOptimization()
  } catch (error) {
    console.warn('Não foi possível solicitar a isenção de bateria:', error)
  }
}

export async function openBatteryOptimizationSettings(): Promise<void> {
  if (!isAndroid()) return
  try {
    await BatteryOptimization.openBatteryOptimizationSettings()
  } catch (error) {
    console.warn('Não foi possível abrir as configurações de bateria:', error)
  }
}

export function wasBatteryOptimizationPromptShown(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(BATTERY_OPTIMIZATION_PROMPT_KEY) === '1'
}

export function markBatteryOptimizationPromptShown(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(BATTERY_OPTIMIZATION_PROMPT_KEY, '1')
}
