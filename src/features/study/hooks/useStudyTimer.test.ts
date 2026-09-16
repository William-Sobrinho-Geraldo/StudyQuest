import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  MAX_STUDY_MINUTES,
  MIN_STUDY_MINUTES,
  STUDY_MINUTE_STEP,
  calculateReward,
  calculateRewardSeconds,
  formatTime,
  generateStudyOptions,
  validateStudyMinutes,
} from '../lib/studyRules'
import { writeAlarmEnabled } from '../lib/studyPreferences'
import { useStudyTimer, type ActionResult } from './useStudyTimer'

const {
  emitStudySessionSaved,
  playCompletionSound,
  scheduleCompletionNotification,
  cancelCompletionNotification,
  scheduleDistractionAlert,
  scheduleSessionCancelledNotification,
  schedulePausedExpiringWarning,
  cancelPendingDistractionNotifications,
  clearPendingFocusNotifications,
} = vi.hoisted(() => ({
  emitStudySessionSaved: vi.fn(),
  playCompletionSound: vi.fn(),
  scheduleCompletionNotification: vi.fn().mockResolvedValue(undefined),
  cancelCompletionNotification: vi.fn().mockResolvedValue(undefined),
  scheduleDistractionAlert: vi.fn().mockResolvedValue(undefined),
  scheduleSessionCancelledNotification: vi.fn().mockResolvedValue(undefined),
  schedulePausedExpiringWarning: vi.fn().mockResolvedValue(undefined),
  cancelPendingDistractionNotifications: vi.fn().mockResolvedValue(undefined),
  clearPendingFocusNotifications: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/studyEvents', () => ({
  emitStudySessionSaved,
}))

vi.mock('../lib/completionSounds', () => ({
  playCompletionSound,
}))

vi.mock('../lib/distractionNotifications', () => ({
  DISTRACTION_GRACE_SECONDS: 20,
  PAUSED_GRACE_SECONDS: 15 * 60,
  scheduleCompletionNotification,
  cancelCompletionNotification,
  scheduleDistractionAlert,
  scheduleSessionCancelledNotification,
  schedulePausedExpiringWarning,
  cancelPendingDistractionNotifications,
  clearPendingFocusNotifications,
}))

const appStateMock = vi.hoisted(() => {
  let callback: ((state: { isActive: boolean }) => void) | null = null
  return {
    addListener: vi.fn((_event: string, cb: (state: { isActive: boolean }) => void) => {
      callback = cb
      return Promise.resolve({ remove: vi.fn() })
    }),
    trigger: (isActive: boolean) => {
      callback?.({ isActive })
    },
  }
})

vi.mock('@capacitor/app', () => ({
  App: { addListener: appStateMock.addListener },
}))

function setupTimer() {
  const saveSession = vi.fn().mockResolvedValue({})
  const utils = renderHook(() => useStudyTimer({ saveSession }))
  return { ...utils, saveSession }
}

async function flushAsync() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  localStorage.clear()
})

describe('studyRules', () => {
  it('define os limites de negócio corretamente', () => {
    expect(MIN_STUDY_MINUTES).toBe(5)
    expect(MAX_STUDY_MINUTES).toBe(90)
    expect(STUDY_MINUTE_STEP).toBe(5)
  })

  it('gera opções de 5 a 90 minutos em incrementos de 5', () => {
    expect(generateStudyOptions()).toEqual(
      Array.from({ length: 18 }, (_, index) => (index + 1) * 5),
    )
  })

  it('valida durações aceitáveis e rejeita as inválidas', () => {
    expect(validateStudyMinutes(5)).toBeNull()
    expect(validateStudyMinutes(30)).toBeNull()
    expect(validateStudyMinutes(90)).toBeNull()

    expect(validateStudyMinutes(3)).not.toBeNull()
    expect(validateStudyMinutes(95)).not.toBeNull()
    expect(validateStudyMinutes(23)).not.toBeNull()
    expect(validateStudyMinutes(7.5)).not.toBeNull()
  })

  it('calcula recompensa: 1 min = 10 XP e 2 Gold', () => {
    expect(calculateReward(5)).toEqual({ xp: 50, gold: 10 })
    expect(calculateReward(30)).toEqual({ xp: 300, gold: 60 })
    expect(calculateReward(60)).toEqual({ xp: 600, gold: 120 })
  })

  it('calcula recompensa por segundos', () => {
    expect(calculateRewardSeconds(300)).toEqual({ xp: 50, gold: 10 })
    expect(calculateRewardSeconds(330)).toEqual({ xp: 55, gold: 11 })
    expect(calculateRewardSeconds(0)).toEqual({ xp: 0, gold: 0 })
  })

  it('formata tempo em MM:SS', () => {
    expect(formatTime(25 * 60_000)).toBe('25:00')
    expect(formatTime(65_000)).toBe('01:05')
    expect(formatTime(0)).toBe('00:00')
  })
})

describe('useStudyTimer — seleção de duração', () => {
  it('aceita apenas durações válidas (5-60, passo de 5)', () => {
    const { result, saveSession } = setupTimer()

    expect(result.current.selectDuration(3).ok).toBe(false)
    expect(result.current.selectDuration(95).ok).toBe(false)
    expect(result.current.selectDuration(17).ok).toBe(false)

    expect(result.current.durationMinutes).toBe(25)
    expect(result.current.remainingMs).toBe(25 * 60_000)

    act(() => {
      const selection = result.current.selectDuration(30)
      expect(selection.ok).toBe(true)
    })

    expect(result.current.durationMinutes).toBe(30)
    expect(result.current.remainingMs).toBe(30 * 60_000)
    expect(result.current.formattedTime).toBe('30:00')

    expect(saveSession).not.toHaveBeenCalled()
  })

  it('bloqueia a alteração de duração durante uma sessão', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.start()
    })

    let selection: ActionResult = { ok: true }
    act(() => {
      selection = result.current.selectDuration(10)
    })

    expect(selection.ok).toBe(false)
    expect(result.current.durationMinutes).toBe(25)
  })
})

describe('useStudyTimer — pausas', () => {
  it('permite pausar e retomar quantas vezes for necessário', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(15)
    })
    act(() => {
      result.current.start()
    })
    expect(result.current.canPause).toBe(true)

    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    let first: ActionResult = { ok: false, message: '' }
    act(() => {
      first = result.current.pause()
    })
    expect(first.ok).toBe(true)
    expect(result.current.status).toBe('paused')

    act(() => {
      result.current.resume()
    })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    let second: ActionResult = { ok: false, message: '' }
    act(() => {
      second = result.current.pause()
    })
    expect(second.ok).toBe(true)
    expect(result.current.canPause).toBe(false)

    act(() => {
      result.current.resume()
    })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    let third: ActionResult = { ok: false, message: '' }
    act(() => {
      third = result.current.pause()
    })
    expect(third.ok).toBe(true)
    expect(result.current.status).toBe('paused')
  })

  it('não pausa uma sessão que não está em andamento', () => {
    const { result } = setupTimer()

    let paused: ActionResult = { ok: true }
    act(() => {
      paused = result.current.pause()
    })

    expect(paused.ok).toBe(false)
    expect(result.current.status).toBe('idle')
  })

  it('não deixa o tempo regressivo correr enquanto pausado', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    act(() => {
      result.current.pause()
    })
    const frozenAt = result.current.remainingMs

    act(() => {
      vi.advanceTimersByTime(5 * 60_000)
    })

    expect(result.current.status).toBe('paused')
    expect(result.current.remainingMs).toBe(frozenAt)
  })
})

describe('useStudyTimer — conclusão e recompensas', () => {
  it('agenda a notificação de conclusão ao iniciar a sessão', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(30)
    })
    act(() => {
      result.current.start()
    })

    expect(scheduleCompletionNotification).toHaveBeenCalledTimes(1)
    expect(scheduleCompletionNotification).toHaveBeenCalledWith(expect.any(Number))
  })

  it('finaliza sessão de 30 min gerando 300 XP / 60 Gold e salva no histórico', async () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(30)
    })
    act(() => {
      result.current.start()
    })

    await act(async () => {
      vi.advanceTimersByTime(30 * 60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('completed')
    expect(result.current.remainingMs).toBe(0)
    expect(result.current.formattedTime).toBe('00:00')
    expect(result.current.lastResult).toEqual({
      durationMinutes: 30,
      xp: 300,
      gold: 60,
    })
    expect(saveSession).toHaveBeenCalledTimes(1)
    expect(saveSession).toHaveBeenCalledWith({
      durationMinutes: 30,
      xp: 300,
      gold: 60,
    })
  })

  it('acumula apenas o tempo efetivamente estudado entre pausas e completa a recompensa total', async () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    act(() => {
      result.current.pause()
    })
    act(() => {
      vi.advanceTimersByTime(3 * 60_000)
    })
    act(() => {
      result.current.resume()
    })

    await act(async () => {
      vi.advanceTimersByTime(4 * 60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('completed')
    expect(saveSession).toHaveBeenCalledWith({
      durationMinutes: 5,
      xp: 50,
      gold: 10,
    })
  })

  it('conclui uma sessão de 5 min com recompensa mínima', async () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })

    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.lastResult).toEqual({
      durationMinutes: 5,
      xp: 50,
      gold: 10,
    })
    expect(saveSession).toHaveBeenCalledTimes(1)
  })

  it('toca o alarme ao zerar apenas quando habilitado', async () => {
    writeAlarmEnabled(true)
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })

    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('completed')
    expect(playCompletionSound).toHaveBeenCalledTimes(1)
  })

  it('emite evento de sessão salva para atualizar o histórico automaticamente', async () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })

    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('completed')
    expect(emitStudySessionSaved).toHaveBeenCalledTimes(1)
  })

  it('não emite evento quando o salvamento da sessão falha', async () => {
    const saveSession = vi.fn().mockRejectedValue(new Error('table does not exist'))
    const { result } = renderHook(() => useStudyTimer({ saveSession }))

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })

    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('completed')
    expect(result.current.saveError).toBe('table does not exist')
    expect(emitStudySessionSaved).not.toHaveBeenCalled()
  })

  it('registra o erro de salvamento sem quebrar a conclusão', async () => {
    const saveSession = vi.fn().mockRejectedValue(new Error('table does not exist'))
    const { result } = renderHook(() => useStudyTimer({ saveSession }))

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })

    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('completed')
    expect(result.current.lastResult).toEqual({
      durationMinutes: 5,
      xp: 50,
      gold: 10,
    })
    expect(result.current.saveError).toBe('table does not exist')
  })

  it('permite reiniciar após a conclusão', async () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })
    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.isCompleted).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.lastResult).toBeNull()
    expect(result.current.durationMinutes).toBe(5)
    expect(result.current.formattedTime).toBe('05:00')
  })

  it('não conclui duas vezes nem duplica o salvamento', async () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(5)
    })
    act(() => {
      result.current.start()
    })

    await act(async () => {
      vi.advanceTimersByTime(5 * 60_000 + 5_000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.status).toBe('completed')
    expect(saveSession).toHaveBeenCalledTimes(1)

    await act(async () => {
      const second = await result.current.finish()
      expect(second).toBeNull()
    })

    expect(saveSession).toHaveBeenCalledTimes(1)
  })

  it('cancela e reagenda a notificação de conclusão ao pausar e retomar', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(10)
      result.current.start()
    })
    scheduleCompletionNotification.mockClear()

    act(() => {
      result.current.pause()
    })
    expect(cancelCompletionNotification).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.resume()
    })
    expect(scheduleCompletionNotification).toHaveBeenCalledTimes(1)
  })

  it('cancela a notificação de conclusão ao reiniciar o timer', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(5)
      result.current.start()
    })
    cancelCompletionNotification.mockClear()

    act(() => {
      result.current.reset()
    })

    expect(cancelCompletionNotification).toHaveBeenCalledTimes(1)
  })
})

describe('useStudyTimer — encerramento antecipado', () => {
  it('abandona a sessão sem salvar quando o tempo estudado é menor que 1 minuto', () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
    })
    act(() => {
      result.current.start()
      result.current.openFocusMode()
    })
    act(() => {
      vi.advanceTimersByTime(30_000)
    })

    let outcome: ActionResult = { ok: false, message: '' }
    act(() => {
      outcome = result.current.finishEarly()
    })

    expect(outcome.ok).toBe(true)
    expect(result.current.status).toBe('idle')
    expect(result.current.isFocusMode).toBe(false)
    expect(saveSession).not.toHaveBeenCalled()
  })

  it('encerra com sucesso parcial proporcional ao tempo estudado', async () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(60)
    })
    act(() => {
      result.current.start()
    })
    act(() => {
      vi.advanceTimersByTime(2 * 60_000 + 30_000)
    })
    act(() => {
      result.current.pause()
    })

    let outcome: ActionResult = { ok: false, message: '' }
    act(() => {
      outcome = result.current.finishEarly()
    })

    expect(outcome.ok).toBe(true)
    expect(result.current.status).toBe('completed')
    expect(result.current.lastResult).toEqual({
      durationMinutes: 2,
      xp: 20,
      gold: 4,
    })

    await flushAsync()
    expect(saveSession).toHaveBeenCalledWith({
      durationMinutes: 2,
      xp: 20,
      gold: 4,
    })
  })
})

describe('useStudyTimer — modo foco', () => {
  it('inicia com foco desativado e permite entrar e sair', () => {
    const { result } = setupTimer()

    expect(result.current.isFocusMode).toBe(false)

    act(() => {
      result.current.openFocusMode()
    })
    expect(result.current.isFocusMode).toBe(true)

    act(() => {
      result.current.closeFocusMode()
    })
    expect(result.current.isFocusMode).toBe(false)
  })
})

describe('useStudyTimer — penalidade por distração (background)', () => {
  it('agenda alerta imediato e aviso de cancelamento ao minimizar em sessão ativa', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(scheduleDistractionAlert).toHaveBeenCalledTimes(1)
    expect(scheduleSessionCancelledNotification).toHaveBeenCalledTimes(1)
    expect(schedulePausedExpiringWarning).not.toHaveBeenCalled()
  })

  it('agenda aviso de pausa expirando ao minimizar com o timer pausado', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
      result.current.pause()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(schedulePausedExpiringWarning).toHaveBeenCalledTimes(1)
    expect(scheduleDistractionAlert).not.toHaveBeenCalled()
  })

  it('não agenda notificação quando não há sessão (idle)', () => {
    setupTimer()

    act(() => {
      appStateMock.trigger(false)
    })

    expect(scheduleDistractionAlert).not.toHaveBeenCalled()
    expect(schedulePausedExpiringWarning).not.toHaveBeenCalled()
    expect(scheduleSessionCancelledNotification).not.toHaveBeenCalled()
  })

  it('recupera a sessão ativa quando retorna em menos de 20 segundos', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(cancelPendingDistractionNotifications).toHaveBeenCalledTimes(1)
    expect(result.current.distractionRecoveryCount).toBe(1)
    expect(result.current.status).toBe('running')
    expect(result.current.distractionCancelled).toBe(false)
  })

  it('cancela a sessão sem recompensas quando fica 20 segundos ou mais fora', () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
      result.current.openFocusMode()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(25_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(result.current.distractionCancelled).toBe(true)
    expect(result.current.distractionCancelReason).toBe('focus')
    expect(result.current.status).toBe('idle')
    expect(result.current.isFocusMode).toBe(false)
    expect(saveSession).not.toHaveBeenCalled()

    act(() => {
      result.current.dismissDistractionCancel()
    })
    expect(result.current.distractionCancelled).toBe(false)
    expect(result.current.distractionCancelReason).toBeNull()
  })

  it('exatamente 20 segundos fora já cancela a sessão ativa', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(20_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(result.current.distractionCancelled).toBe(true)
    expect(result.current.distractionCancelReason).toBe('focus')
    expect(result.current.status).toBe('idle')
  })

  it('recupera a sessão pausada quando retorna antes de 15 minutos', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
      result.current.pause()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(5 * 60_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(cancelPendingDistractionNotifications).toHaveBeenCalledTimes(1)
    expect(result.current.distractionRecoveryCount).toBe(1)
    expect(result.current.status).toBe('paused')
    expect(result.current.distractionCancelled).toBe(false)
  })

  it('expira a sessão pausada quando fica 15 minutos ou mais fora', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
      result.current.pause()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(15 * 60_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(result.current.distractionCancelled).toBe(true)
    expect(result.current.distractionCancelReason).toBe('paused')
    expect(result.current.status).toBe('idle')
  })
})

describe('useStudyTimer — limpeza de notificações pendentes', () => {
  it('limpa as notificações pendentes na montagem do hook', () => {
    setupTimer()

    expect(clearPendingFocusNotifications).toHaveBeenCalledTimes(1)
  })

  it('limpa as notificações ao concluir a sessão', async () => {
    const { result } = setupTimer()
    clearPendingFocusNotifications.mockClear()

    await act(async () => {
      await result.current.finish()
    })

    expect(clearPendingFocusNotifications).toHaveBeenCalledTimes(1)
  })

  it('limpa as notificações ao reiniciar o timer', () => {
    const { result } = setupTimer()
    clearPendingFocusNotifications.mockClear()

    act(() => {
      result.current.reset()
    })

    expect(clearPendingFocusNotifications).toHaveBeenCalledTimes(1)
  })

  it('limpa as notificações ao cancelar a sessão por distração', () => {
    const { result } = setupTimer()
    clearPendingFocusNotifications.mockClear()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })
    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(25_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(result.current.distractionCancelled).toBe(true)
    expect(clearPendingFocusNotifications).toHaveBeenCalledTimes(1)
  })
})

describe('useStudyTimer — bloqueio de tela vs minimização', () => {
  it('não agenda notificações quando a tela é apenas bloqueada (validação não dispara)', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })

    expect(scheduleDistractionAlert).not.toHaveBeenCalled()
    expect(scheduleSessionCancelledNotification).not.toHaveBeenCalled()
    expect(schedulePausedExpiringWarning).not.toHaveBeenCalled()
    expect(result.current.status).toBe('running')
  })

  it('mantém a sessão ativa ao desbloquear após bloqueio de tela', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      // Simula o congelamento do SO: o relógio avança, mas o timer de
      // validação de 150ms não executa (JS suspenso).
      vi.setSystemTime(new Date(Date.now() + 60_000))
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(result.current.status).toBe('running')
    expect(result.current.distractionCancelled).toBe(false)
    expect(result.current.distractionRecoveryCount).toBe(0)
    expect(scheduleDistractionAlert).not.toHaveBeenCalled()
    expect(cancelPendingDistractionNotifications).not.toHaveBeenCalled()
  })

  it('aplica a penalidade quando a validação dispara (app minimizado)', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    act(() => {
      vi.advanceTimersByTime(25_000)
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(scheduleDistractionAlert).toHaveBeenCalledTimes(1)
    expect(result.current.distractionCancelled).toBe(true)
    expect(result.current.distractionCancelReason).toBe('focus')
  })

  it('não agenda notificações quando recebe onNativeScreenOff (bloqueio de tela nativo)', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      window.dispatchEvent(new CustomEvent('onNativeScreenOff'))
    })
    act(() => {
      vi.advanceTimersByTime(200)
    })

    expect(scheduleDistractionAlert).not.toHaveBeenCalled()
    expect(scheduleSessionCancelledNotification).not.toHaveBeenCalled()
    expect(schedulePausedExpiringWarning).not.toHaveBeenCalled()
    expect(result.current.status).toBe('running')
  })

  it('mantém a sessão ativa ao desbloquear após bloqueio de tela nativo, sem penalidade', () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      window.dispatchEvent(new CustomEvent('onNativeScreenOff'))
    })
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    act(() => {
      window.dispatchEvent(new CustomEvent('onNativeScreenOn'))
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(result.current.status).toBe('running')
    expect(result.current.distractionCancelled).toBe(false)
    expect(result.current.distractionRecoveryCount).toBe(0)
    expect(scheduleDistractionAlert).not.toHaveBeenCalled()
    expect(cancelPendingDistractionNotifications).not.toHaveBeenCalled()
    expect(saveSession).not.toHaveBeenCalled()
  })

  it('não cancela ao bloquear a tela logo após retomar uma sessão pausada', () => {
    const { result, saveSession } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })
    act(() => {
      result.current.pause()
    })
    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    act(() => {
      appStateMock.trigger(true)
    })
    act(() => {
      result.current.resume()
    })
    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      window.dispatchEvent(new CustomEvent('onNativeScreenOff'))
    })
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    act(() => {
      window.dispatchEvent(new CustomEvent('onNativeScreenOn'))
    })
    act(() => {
      appStateMock.trigger(true)
    })

    expect(result.current.status).toBe('running')
    expect(result.current.distractionCancelled).toBe(false)
    expect(scheduleDistractionAlert).not.toHaveBeenCalled()
    expect(saveSession).not.toHaveBeenCalled()
  })

  it('ainda penaliza a minimização quando onNativeScreenOff não chega', () => {
    const { result } = setupTimer()

    act(() => {
      result.current.selectDuration(25)
      result.current.start()
    })

    act(() => {
      appStateMock.trigger(false)
    })
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(scheduleDistractionAlert).toHaveBeenCalledTimes(1)
    expect(scheduleSessionCancelledNotification).toHaveBeenCalledTimes(1)
  })
})