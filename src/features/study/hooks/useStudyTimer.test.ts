import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  MAX_PAUSES,
  MAX_STUDY_MINUTES,
  MIN_STUDY_MINUTES,
  STUDY_MINUTE_STEP,
  calculateReward,
  formatTime,
  generateStudyOptions,
  validateStudyMinutes,
} from '../lib/studyRules'
import { useStudyTimer, type ActionResult } from './useStudyTimer'

const { emitStudySessionSaved } = vi.hoisted(() => ({
  emitStudySessionSaved: vi.fn(),
}))

vi.mock('../lib/studyEvents', () => ({
  emitStudySessionSaved,
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
})

describe('studyRules', () => {
  it('define os limites de negócio corretamente', () => {
    expect(MIN_STUDY_MINUTES).toBe(5)
    expect(MAX_STUDY_MINUTES).toBe(60)
    expect(STUDY_MINUTE_STEP).toBe(5)
    expect(MAX_PAUSES).toBe(2)
  })

  it('gera opções de 5 a 60 minutos em incrementos de 5', () => {
    expect(generateStudyOptions()).toEqual(
      Array.from({ length: 12 }, (_, index) => (index + 1) * 5),
    )
  })

  it('valida durações aceitáveis e rejeita as inválidas', () => {
    expect(validateStudyMinutes(5)).toBeNull()
    expect(validateStudyMinutes(30)).toBeNull()
    expect(validateStudyMinutes(60)).toBeNull()

    expect(validateStudyMinutes(3)).not.toBeNull()
    expect(validateStudyMinutes(65)).not.toBeNull()
    expect(validateStudyMinutes(23)).not.toBeNull()
    expect(validateStudyMinutes(7.5)).not.toBeNull()
  })

  it('calcula recompensa: 1 min = 10 XP e 2 Gold', () => {
    expect(calculateReward(5)).toEqual({ xp: 50, gold: 10 })
    expect(calculateReward(30)).toEqual({ xp: 300, gold: 60 })
    expect(calculateReward(60)).toEqual({ xp: 600, gold: 120 })
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
    expect(result.current.selectDuration(65).ok).toBe(false)
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

describe('useStudyTimer — pausas de emergência', () => {
  it('permite no máximo 2 pausas e ignora a terceira', () => {
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
    expect(result.current.pausesUsed).toBe(1)
    expect(result.current.pausesRemaining).toBe(1)

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
    expect(result.current.pausesUsed).toBe(2)
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
    expect(third.ok).toBe(false)
    expect(result.current.pausesUsed).toBe(2)
    expect(result.current.status).toBe('running')
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
    expect(result.current.pausesUsed).toBe(0)
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

    await flushAsync()
    expect(saveSession).toHaveBeenCalledTimes(1)
  })
})