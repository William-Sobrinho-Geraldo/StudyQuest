import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isNativePlatform = vi.hoisted(() => vi.fn(() => true))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}))

const { requestPermissions, schedule, cancel, getPending } = vi.hoisted(() => ({
  requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
  schedule: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
  getPending: vi.fn().mockResolvedValue({ notifications: [] }),
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions,
    schedule,
    cancel,
    getPending,
  },
}))

import {
  DISTRACTION_ALERT_NOTIFICATION_ID,
  DISTRACTION_CANCEL_NOTIFICATION_ID,
  PAUSED_WARNING_NOTIFICATION_ID,
  cancelPendingDistractionNotifications,
  clearPendingFocusNotifications,
  scheduleDistractionAlert,
  schedulePausedExpiringWarning,
  scheduleSessionCancelledNotification,
} from './distractionNotifications'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
  vi.clearAllMocks()
  isNativePlatform.mockReturnValue(true)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('distractionNotifications', () => {
  it('agenda o alerta de foco imediatamente (2s após a saída)', async () => {
    await scheduleDistractionAlert()

    expect(schedule).toHaveBeenCalledTimes(1)
    const options = schedule.mock.calls[0][0]
    expect(options.notifications).toHaveLength(1)
    expect(options.notifications[0].id).toBe(DISTRACTION_ALERT_NOTIFICATION_ID)
    expect(options.notifications[0].title).toContain('Aviso de Foco')
    expect(options.notifications[0].body).toContain('20 segundos')
    expect(options.notifications[0].schedule.at).toEqual(
      new Date('2026-09-15T12:00:02.000Z'),
    )
  })

  it('agenda a notificação de sessão cancelada no limite de 20 segundos', async () => {
    await scheduleSessionCancelledNotification()

    const options = schedule.mock.calls[0][0]
    expect(options.notifications[0].id).toBe(DISTRACTION_CANCEL_NOTIFICATION_ID)
    expect(options.notifications[0].title).toContain('Sessão Cancelada')
    expect(options.notifications[0].schedule.at).toEqual(
      new Date('2026-09-15T12:00:20.000Z'),
    )
  })

  it('agenda o aviso de pausa expirando aos 2 minutos', async () => {
    await schedulePausedExpiringWarning()

    const options = schedule.mock.calls[0][0]
    expect(options.notifications[0].id).toBe(PAUSED_WARNING_NOTIFICATION_ID)
    expect(options.notifications[0].title).toContain('Sessão Pausada Expirando')
    expect(options.notifications[0].schedule.at).toEqual(
      new Date('2026-09-15T12:02:00.000Z'),
    )
  })

  it('cancela todas as notificações pendentes de distração', async () => {
    await cancelPendingDistractionNotifications()

    expect(cancel).toHaveBeenCalledWith({
      notifications: [
        { id: DISTRACTION_ALERT_NOTIFICATION_ID },
        { id: DISTRACTION_CANCEL_NOTIFICATION_ID },
        { id: PAUSED_WARNING_NOTIFICATION_ID },
      ],
    })
  })

  it('não agenda nem cancela quando não está em plataforma nativa', async () => {
    isNativePlatform.mockReturnValue(false)

    await scheduleDistractionAlert()
    await scheduleSessionCancelledNotification()
    await schedulePausedExpiringWarning()
    await cancelPendingDistractionNotifications()
    await clearPendingFocusNotifications()

    expect(requestPermissions).not.toHaveBeenCalled()
    expect(schedule).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expect(getPending).not.toHaveBeenCalled()
  })

  it('clearPendingFocusNotifications cancela as notificações pendentes', async () => {
    getPending.mockResolvedValue({
      notifications: [{ id: 1, title: 'A', body: 'B' }, { id: 2, title: 'C', body: 'D' }],
    })

    await clearPendingFocusNotifications()

    expect(getPending).toHaveBeenCalledTimes(1)
    expect(cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1, title: 'A', body: 'B' }, { id: 2, title: 'C', body: 'D' }],
    })
  })

  it('clearPendingFocusNotifications não cancela quando não há pendentes', async () => {
    getPending.mockResolvedValue({ notifications: [] })

    await clearPendingFocusNotifications()

    expect(getPending).toHaveBeenCalledTimes(1)
    expect(cancel).not.toHaveBeenCalled()
  })

  it('clearPendingFocusNotifications engole erros sem lançar', async () => {
    getPending.mockRejectedValue(new Error('bridge down'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(clearPendingFocusNotifications()).resolves.toBeUndefined()

    expect(consoleError).toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
