import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const isNativePlatform = vi.hoisted(() => vi.fn(() => true))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => isNativePlatform(),
  },
}))

const { checkPermissions, requestPermissions, checkExactNotificationSetting, changeExactNotificationSetting, schedule, cancel, getPending, createChannel, registerActionTypes } = vi.hoisted(() => ({
  checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
  requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
  checkExactNotificationSetting: vi.fn().mockResolvedValue({ exact_alarm: 'granted' }),
  changeExactNotificationSetting: vi.fn().mockResolvedValue({ exact_alarm: 'granted' }),
  schedule: vi.fn().mockResolvedValue(undefined),
  cancel: vi.fn().mockResolvedValue(undefined),
  getPending: vi.fn().mockResolvedValue({ notifications: [] }),
  createChannel: vi.fn().mockResolvedValue(undefined),
  registerActionTypes: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions,
    requestPermissions,
    checkExactNotificationSetting,
    changeExactNotificationSetting,
    schedule,
    cancel,
    getPending,
    createChannel,
    registerActionTypes,
  },
}))

import {
  COMPLETION_NOTIFICATION_ID,
  DISTRACTION_ALERT_NOTIFICATION_ID,
  DISTRACTION_CANCEL_NOTIFICATION_ID,
  OPEN_APP_ACTION_TYPE_ID,
  PAUSED_WARNING_NOTIFICATION_ID,
  SILENT_ALARM_CHANNEL_ID,
  alarmChannelIdForSound,
  cancelCompletionNotification,
  cancelPendingDistractionNotifications,
  clearPendingFocusNotifications,
  hasExactAlarmPermission,
  openExactAlarmSettings,
  registerOpenAppActionType,
  requestNotificationPermissions,
  scheduleCompletionNotification,
  scheduleDistractionAlert,
  schedulePausedExpiringWarning,
  scheduleSessionCancelledNotification,
  setupAlarmNotificationChannels,
} from './distractionNotifications'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
  vi.clearAllMocks()
  isNativePlatform.mockReturnValue(true)
  localStorage.clear()
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

  it('agenda a notificação de conclusão do Pomodoro no horário exato', async () => {
    await scheduleCompletionNotification(new Date('2026-09-15T12:25:00.000Z').getTime())

    const options = schedule.mock.calls[0][0]
    expect(options.notifications[0].id).toBe(COMPLETION_NOTIFICATION_ID)
    expect(options.notifications[0].title).toContain('Sessão Concluída')
    expect(options.notifications[0].schedule.at).toEqual(
      new Date('2026-09-15T12:25:00.000Z'),
    )
  })

  it('cancela a notificação de conclusão pendente', async () => {
    await cancelCompletionNotification()

    expect(cancel).toHaveBeenCalledWith({
      notifications: [{ id: COMPLETION_NOTIFICATION_ID }],
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

describe('setupAlarmNotificationChannels', () => {
  it('cria um canal de alta importância para cada som e um canal silencioso', async () => {
    await setupAlarmNotificationChannels()

    expect(createChannel).toHaveBeenCalledTimes(5)

    const channelIds = createChannel.mock.calls.map((call) => call[0].id)
    expect(channelIds).toContain(alarmChannelIdForSound('crystal_bell'))
    expect(channelIds).toContain(alarmChannelIdForSound('victory_fanfare'))
    expect(channelIds).toContain(alarmChannelIdForSound('magic_harp'))
    expect(channelIds).toContain(alarmChannelIdForSound('war_gong'))
    expect(channelIds).toContain(SILENT_ALARM_CHANNEL_ID)

    const crystalChannel = createChannel.mock.calls.find(
      (call) => call[0].id === alarmChannelIdForSound('crystal_bell'),
    )![0]
    expect(crystalChannel.importance).toBe(5)
    expect(crystalChannel.sound).toBe('crystal_bell.wav')
    expect(crystalChannel.vibration).toBe(true)
    expect(crystalChannel.lights).toBe(true)
    expect(crystalChannel.visibility).toBe(1)

    const silentChannel = createChannel.mock.calls.find(
      (call) => call[0].id === SILENT_ALARM_CHANNEL_ID,
    )![0]
    expect(silentChannel.importance).toBe(5)
    expect(silentChannel.sound).toBeUndefined()
  })

  it('não cria canais quando não está em plataforma nativa', async () => {
    isNativePlatform.mockReturnValue(false)

    await setupAlarmNotificationChannels()

    expect(createChannel).not.toHaveBeenCalled()
  })
})

describe('scheduleCompletionNotification — canal e alarme exato', () => {
  it('usa o canal silencioso quando o alarme está desativado', async () => {
    localStorage.setItem('studyquest:alarm-enabled', 'false')

    await scheduleCompletionNotification(new Date('2026-09-15T12:25:00.000Z').getTime())

    const notification = schedule.mock.calls[0][0].notifications[0]
    expect(notification.channelId).toBe(SILENT_ALARM_CHANNEL_ID)
    expect(notification.schedule.allowWhileIdle).toBe(true)
    expect(notification.schedule.repeats).toBe(false)
    expect(notification.isExactNotification).toBe(true)
    expect(notification.ongoing).toBe(false)
    expect(notification.autoCancel).toBe(true)
  })

  it('usa o canal do som por padrão quando o alarme ainda não foi configurado', async () => {
    await scheduleCompletionNotification(new Date('2026-09-15T12:25:00.000Z').getTime())

    const notification = schedule.mock.calls[0][0].notifications[0]
    expect(notification.channelId).not.toBe(SILENT_ALARM_CHANNEL_ID)
  })

  it('usa o canal do som selecionado quando o alarme está ativado', async () => {
    localStorage.setItem('studyquest:alarm-enabled', 'true')
    localStorage.setItem('studyquest:completion-sound', 'war_gong')

    await scheduleCompletionNotification(new Date('2026-09-15T12:25:00.000Z').getTime())

    const notification = schedule.mock.calls[0][0].notifications[0]
    expect(notification.channelId).toBe(alarmChannelIdForSound('war_gong'))
    expect(notification.schedule.allowWhileIdle).toBe(true)
    expect(notification.isExactNotification).toBe(true)
    expect(notification.actionTypeId).toBe(OPEN_APP_ACTION_TYPE_ID)
  })

  it('solicita alarme exato quando a permissão ainda não foi concedida', async () => {
    checkExactNotificationSetting.mockResolvedValue({ exact_alarm: 'prompt' })

    await scheduleCompletionNotification(new Date('2026-09-15T12:25:00.000Z').getTime())

    expect(checkExactNotificationSetting).toHaveBeenCalledTimes(1)
    expect(changeExactNotificationSetting).toHaveBeenCalledTimes(1)
  })

  it('não solicita alarme exato quando já concedido', async () => {
    checkExactNotificationSetting.mockResolvedValue({ exact_alarm: 'granted' })

    await scheduleCompletionNotification(new Date('2026-09-15T12:25:00.000Z').getTime())

    expect(checkExactNotificationSetting).toHaveBeenCalledTimes(1)
    expect(changeExactNotificationSetting).not.toHaveBeenCalled()
  })
})

describe('registerOpenAppActionType', () => {
  it('registra o tipo de ação OPEN_APP com o botão Abrir', async () => {
    await registerOpenAppActionType()

    expect(registerActionTypes).toHaveBeenCalledTimes(1)
    expect(registerActionTypes).toHaveBeenCalledWith({
      types: [
        {
          id: OPEN_APP_ACTION_TYPE_ID,
          actions: [{ id: 'open', title: 'Abrir' }],
        },
      ],
    })
  })

  it('não registra quando não está em plataforma nativa', async () => {
    isNativePlatform.mockReturnValue(false)

    await registerOpenAppActionType()

    expect(registerActionTypes).not.toHaveBeenCalled()
  })
})

describe('requestNotificationPermissions', () => {
  it('retorna true sem solicitar quando a permissão já está concedida', async () => {
    checkPermissions.mockResolvedValue({ display: 'granted' })

    const result = await requestNotificationPermissions()

    expect(result).toBe(true)
    expect(requestPermissions).not.toHaveBeenCalled()
  })

  it('solicita permissão quando ainda não foi concedida', async () => {
    checkPermissions.mockResolvedValue({ display: 'prompt' })
    requestPermissions.mockResolvedValue({ display: 'granted' })

    const result = await requestNotificationPermissions()

    expect(result).toBe(true)
    expect(requestPermissions).toHaveBeenCalledTimes(1)
  })

  it('retorna false e avisa quando o usuário nega a permissão', async () => {
    checkPermissions.mockResolvedValue({ display: 'prompt' })
    requestPermissions.mockResolvedValue({ display: 'denied' })
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await requestNotificationPermissions()

    expect(result).toBe(false)
    expect(consoleWarn).toHaveBeenCalled()
    consoleWarn.mockRestore()
  })

  it('retorna false quando não está em plataforma nativa', async () => {
    isNativePlatform.mockReturnValue(false)

    const result = await requestNotificationPermissions()

    expect(result).toBe(false)
    expect(checkPermissions).not.toHaveBeenCalled()
  })
})

describe('hasExactAlarmPermission', () => {
  it('retorna true quando o alarme exato está concedido', async () => {
    checkExactNotificationSetting.mockResolvedValue({ exact_alarm: 'granted' })

    const result = await hasExactAlarmPermission()

    expect(result).toBe(true)
    expect(checkExactNotificationSetting).toHaveBeenCalledTimes(1)
  })

  it('retorna false quando o alarme exato está negado', async () => {
    checkExactNotificationSetting.mockResolvedValue({ exact_alarm: 'denied' })

    const result = await hasExactAlarmPermission()

    expect(result).toBe(false)
  })

  it('retorna true quando não está em plataforma nativa', async () => {
    isNativePlatform.mockReturnValue(false)

    const result = await hasExactAlarmPermission()

    expect(result).toBe(true)
    expect(checkExactNotificationSetting).not.toHaveBeenCalled()
  })
})

describe('openExactAlarmSettings', () => {
  it('abre a tela de alarmes exatos', async () => {
    await openExactAlarmSettings()

    expect(changeExactNotificationSetting).toHaveBeenCalledTimes(1)
  })

  it('não faz nada quando não está em plataforma nativa', async () => {
    isNativePlatform.mockReturnValue(false)

    await openExactAlarmSettings()

    expect(changeExactNotificationSetting).not.toHaveBeenCalled()
  })
})
