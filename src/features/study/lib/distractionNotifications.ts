import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { SOUND_OPTIONS, getSelectedSoundKey } from './completionSounds'
import { readAlarmEnabled } from './studyPreferences'

export const DISTRACTION_GRACE_SECONDS = 20
export const PAUSED_GRACE_SECONDS = 15 * 60
export const PAUSED_WARNING_DELAY_SECONDS = 2 * 60

export const DISTRACTION_ALERT_NOTIFICATION_ID = 49213
export const DISTRACTION_CANCEL_NOTIFICATION_ID = 49214
export const PAUSED_WARNING_NOTIFICATION_ID = 49215
export const COMPLETION_NOTIFICATION_ID = 49216

export const ALARM_CHANNEL_ID_PREFIX = 'pomodoro_alarm'
export const ALARM_CHANNEL_ID_SUFFIX = 'v3'
export const SILENT_ALARM_CHANNEL_ID = 'pomodoro_alarm_silent_v3'
export const OPEN_APP_ACTION_TYPE_ID = 'OPEN_APP'

export function alarmChannelIdForSound(key: string): string {
  return `${ALARM_CHANNEL_ID_PREFIX}_${key}_${ALARM_CHANNEL_ID_SUFFIX}`
}

export async function registerOpenAppActionType(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: OPEN_APP_ACTION_TYPE_ID,
        actions: [{ id: 'open', title: 'Abrir' }],
      },
    ],
  })
}

export async function setupAlarmNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  for (const option of SOUND_OPTIONS) {
    await LocalNotifications.createChannel({
      id: alarmChannelIdForSound(option.key),
      name: 'Alarme do Pomodoro',
      description: 'Notificações sonoras de conclusão do tempo de foco',
      importance: 5,
      sound: `${option.key}.wav`,
      visibility: 1,
      vibration: true,
      lights: true,
    })
  }
  await LocalNotifications.createChannel({
    id: SILENT_ALARM_CHANNEL_ID,
    name: 'Alarme do Pomodoro',
    description: 'Notificações silenciosas de conclusão do tempo de foco',
    importance: 5,
    visibility: 1,
    vibration: false,
    lights: false,
  })
}

const ALERT_DELAY_MS = 2_000

let permissionsRequested = false

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const status = await LocalNotifications.checkPermissions()
    if (status.display === 'granted') return true
    const request = await LocalNotifications.requestPermissions()
    if (request.display !== 'granted') {
      console.warn('Permissão de notificação negada pelo usuário.')
      return false
    }
    return true
  } catch {
    return false
  }
}

async function ensurePermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (permissionsRequested) return
  permissionsRequested = true
  await requestNotificationPermissions()
}

export async function hasExactAlarmPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true
  try {
    const status = await LocalNotifications.checkExactNotificationSetting()
    return status.exact_alarm === 'granted'
  } catch {
    return true
  }
}

export async function openExactAlarmSettings(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await LocalNotifications.changeExactNotificationSetting()
  } catch {
    // Best-effort: sem permissão, o agendamento cai para alarme inexato.
  }
}

async function ensureExactAlarmPermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (await hasExactAlarmPermission()) return
  await openExactAlarmSettings()
}

async function scheduleNotification(
  id: number,
  title: string,
  body: string,
  at: number,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await ensurePermission()
  await LocalNotifications.schedule({
    notifications: [
      {
        id,
        title,
        body,
        schedule: { at: new Date(at), allowWhileIdle: true },
        isExactNotification: true,
      },
    ],
  })
}

export async function scheduleDistractionAlert(): Promise<void> {
  await scheduleNotification(
    DISTRACTION_ALERT_NOTIFICATION_ID,
    '⚠️ Aviso de Foco!',
    'Você saiu do StudyQuest. Volte em menos de 20 segundos para não perder o seu progresso de XP!',
    Date.now() + ALERT_DELAY_MS,
  )
}

export async function scheduleSessionCancelledNotification(): Promise<void> {
  await scheduleNotification(
    DISTRACTION_CANCEL_NOTIFICATION_ID,
    '💔 Sessão Cancelada',
    'O tempo limite expirou e sua sessão de foco foi encerrada.',
    Date.now() + DISTRACTION_GRACE_SECONDS * 1000,
  )
}

export async function schedulePausedExpiringWarning(): Promise<void> {
  await scheduleNotification(
    PAUSED_WARNING_NOTIFICATION_ID,
    '⏱️ Sessão Pausada Expirando',
    'Sua sessão está pausada. Retorne em até 15 minutos para não perder seu progresso.',
    Date.now() + PAUSED_WARNING_DELAY_SECONDS * 1000,
  )
}

export async function scheduleCompletionNotification(at: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await ensurePermission()
  await ensureExactAlarmPermission()
  const alarmEnabled = readAlarmEnabled()
  const soundKey = getSelectedSoundKey()
  const channelId = alarmEnabled
    ? alarmChannelIdForSound(soundKey)
    : SILENT_ALARM_CHANNEL_ID
  console.log(
    `[StudyQuest] Agendando notificação de conclusão -> targetEndTimeMs=${at} (${new Date(at).toISOString()}), channel=${channelId}, sound=${alarmEnabled ? `${soundKey}.wav` : 'silent'}`,
  )
  await LocalNotifications.schedule({
    notifications: [
      {
        id: COMPLETION_NOTIFICATION_ID,
        title: '🎉 Sessão Concluída!',
        body: 'Seu Pomodoro terminou. Volte ao StudyQuest para coletar suas recompensas!',
        schedule: { at: new Date(at), allowWhileIdle: true, repeats: false },
        channelId,
        isExactNotification: true,
        ongoing: false,
        autoCancel: true,
        foreground: true,
        actionTypeId: OPEN_APP_ACTION_TYPE_ID,
      },
    ],
  })
}

export async function cancelCompletionNotification(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.cancel({
    notifications: [{ id: COMPLETION_NOTIFICATION_ID }],
  })
}

export async function cancelPendingDistractionNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  await LocalNotifications.cancel({
    notifications: [
      { id: DISTRACTION_ALERT_NOTIFICATION_ID },
      { id: DISTRACTION_CANCEL_NOTIFICATION_ID },
      { id: PAUSED_WARNING_NOTIFICATION_ID },
    ],
  })
}

export async function clearPendingFocusNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel(pending)
    }
  } catch (error) {
    console.error('Erro ao limpar notificações pendentes:', error)
  }
}
