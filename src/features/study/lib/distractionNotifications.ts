import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const DISTRACTION_GRACE_SECONDS = 20
export const PAUSED_GRACE_SECONDS = 15 * 60
export const PAUSED_WARNING_DELAY_SECONDS = 2 * 60

export const DISTRACTION_ALERT_NOTIFICATION_ID = 49213
export const DISTRACTION_CANCEL_NOTIFICATION_ID = 49214
export const PAUSED_WARNING_NOTIFICATION_ID = 49215

const ALERT_DELAY_MS = 2_000

let permissionsRequested = false

async function ensurePermission(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  if (permissionsRequested) return
  permissionsRequested = true
  try {
    await LocalNotifications.requestPermissions()
  } catch {
    // Permissão é best-effort: sem ela, o agendamento falha silenciosamente.
  }
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
        schedule: { at: new Date(at) },
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
