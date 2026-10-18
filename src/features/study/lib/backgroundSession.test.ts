import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getPlatform = vi.hoisted(() => vi.fn(() => 'android'))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => getPlatform(),
  },
}))

const {
  createNotificationChannel,
  startForegroundService,
  updateForegroundService,
  stopForegroundService,
  isBatteryOptimizationEnabledApi,
  requestIgnoreBatteryOptimization,
  openBatteryOptimizationSettings,
} = vi.hoisted(() => ({
  createNotificationChannel: vi.fn().mockResolvedValue(undefined),
  startForegroundService: vi.fn().mockResolvedValue(undefined),
  updateForegroundService: vi.fn().mockResolvedValue(undefined),
  stopForegroundService: vi.fn().mockResolvedValue(undefined),
  isBatteryOptimizationEnabledApi: vi.fn().mockResolvedValue({ enabled: true }),
  requestIgnoreBatteryOptimization: vi.fn().mockResolvedValue(undefined),
  openBatteryOptimizationSettings: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@capawesome-team/capacitor-android-foreground-service', () => ({
  ForegroundService: {
    createNotificationChannel,
    startForegroundService,
    updateForegroundService,
    stopForegroundService,
  },
  Importance: { Min: 1, Low: 2, Default: 3, High: 4, Max: 5 },
}))

vi.mock('@capawesome-team/capacitor-android-battery-optimization', () => ({
  BatteryOptimization: {
    isBatteryOptimizationEnabled: isBatteryOptimizationEnabledApi,
    requestIgnoreBatteryOptimization,
    openBatteryOptimizationSettings,
  },
}))

async function loadModule() {
  vi.resetModules()
  return import('./backgroundSession')
}

beforeEach(() => {
  vi.clearAllMocks()
  getPlatform.mockReturnValue('android')
  localStorage.clear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('backgroundSession — serviço em primeiro plano', () => {
  it('cria o canal e inicia o serviço na primeira execução', async () => {
    const { startFocusForegroundService, FOCUS_SERVICE_CHANNEL_ID } = await loadModule()

    await startFocusForegroundService()

    expect(createNotificationChannel).toHaveBeenCalledTimes(1)
    expect(createNotificationChannel.mock.calls[0][0].id).toBe(FOCUS_SERVICE_CHANNEL_ID)

    expect(startForegroundService).toHaveBeenCalledTimes(1)
    const options = startForegroundService.mock.calls[0][0]
    expect(options.smallIcon).toBe('ic_stat_studyquest')
    expect(options.silent).toBe(true)
    expect(options.notificationChannelId).toBe(FOCUS_SERVICE_CHANNEL_ID)
    expect(updateForegroundService).not.toHaveBeenCalled()
  })

  it('atualiza o serviço quando já está em execução', async () => {
    const { startFocusForegroundService } = await loadModule()

    await startFocusForegroundService()
    await startFocusForegroundService()

    expect(startForegroundService).toHaveBeenCalledTimes(1)
    expect(updateForegroundService).toHaveBeenCalledTimes(1)
  })

  it('para o serviço e volta a iniciar (não atualiza) depois de parar', async () => {
    const { startFocusForegroundService, stopFocusForegroundService } = await loadModule()

    await startFocusForegroundService()
    await stopFocusForegroundService()
    expect(stopForegroundService).toHaveBeenCalledTimes(1)

    await startFocusForegroundService()
    expect(startForegroundService).toHaveBeenCalledTimes(2)
    expect(updateForegroundService).not.toHaveBeenCalled()
  })

  it('não faz nada quando a plataforma não é Android', async () => {
    getPlatform.mockReturnValue('web')
    const { startFocusForegroundService, stopFocusForegroundService } = await loadModule()

    await startFocusForegroundService()
    await stopFocusForegroundService()

    expect(createNotificationChannel).not.toHaveBeenCalled()
    expect(startForegroundService).not.toHaveBeenCalled()
    expect(stopForegroundService).not.toHaveBeenCalled()
  })

  it('não quebra quando a API do serviço rejeita', async () => {
    startForegroundService.mockRejectedValue(new Error('boom'))
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { startFocusForegroundService } = await loadModule()

    await expect(startFocusForegroundService()).resolves.toBeUndefined()
    expect(consoleWarn).toHaveBeenCalled()
  })
})

describe('backgroundSession — otimização de bateria', () => {
  it('retorna o estado de otimização no Android', async () => {
    isBatteryOptimizationEnabledApi.mockResolvedValue({ enabled: true })
    const { isBatteryOptimizationEnabled } = await loadModule()

    await expect(isBatteryOptimizationEnabled()).resolves.toBe(true)
  })

  it('retorna false fora do Android', async () => {
    getPlatform.mockReturnValue('web')
    const { isBatteryOptimizationEnabled } = await loadModule()

    await expect(isBatteryOptimizationEnabled()).resolves.toBe(false)
    expect(isBatteryOptimizationEnabledApi).not.toHaveBeenCalled()
  })

  it('solicita a isenção de bateria', async () => {
    const { requestIgnoreBatteryOptimization: request } = await loadModule()

    await request()

    expect(requestIgnoreBatteryOptimization).toHaveBeenCalledTimes(1)
  })

  it('marca e lê o aviso de otimização de bateria já exibido', async () => {
    const { wasBatteryOptimizationPromptShown, markBatteryOptimizationPromptShown } =
      await loadModule()

    expect(wasBatteryOptimizationPromptShown()).toBe(false)
    markBatteryOptimizationPromptShown()
    expect(wasBatteryOptimizationPromptShown()).toBe(true)
  })
})
