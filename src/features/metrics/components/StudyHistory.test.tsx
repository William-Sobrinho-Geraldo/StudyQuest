import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudyHistory } from './StudyHistory'
import { emitStudySessionSaved } from '../../study/lib/studyEvents'
import type { StudyHistoryBucket } from '../services/studyHistoryService'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc },
}))

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days, 12)).toISOString().slice(0, 10)
}

const DATE_2026_09_08 = '2026-09-08'

function weekBuckets(): StudyHistoryBucket[] {
  const base = { hour: 0, sessions: 0, minutes: 0 }
  return [
    { bucket_date: '2026-09-07', ...base, minutes: 15, sessions: 1 },
    { bucket_date: '2026-09-08', ...base, minutes: 50, sessions: 2 },
    { bucket_date: '2026-09-09', ...base },
    { bucket_date: '2026-09-10', ...base },
    { bucket_date: '2026-09-11', ...base },
    { bucket_date: '2026-09-12', ...base },
    { bucket_date: '2026-09-13', ...base, minutes: 45, sessions: 1 },
  ]
}

function dayBuckets(): StudyHistoryBucket[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    bucket_date: DATE_2026_09_08,
    hour,
    minutes: hour === 9 ? 30 : hour === 11 ? 20 : 0,
    sessions: hour === 9 || hour === 11 ? 1 : 0,
  }))
}

function emptyWeekBuckets(): StudyHistoryBucket[] {
  return weekBuckets().map((bucket) => ({ ...bucket, minutes: 0, sessions: 0 }))
}

describe('StudyHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rpc.mockResolvedValue({ data: weekBuckets(), error: null })
  })

  it('carrega a semana atual por padrão e resume sessões e minutos', async () => {
    render(<StudyHistory />)

    expect(await screen.findByTestId('history-summary')).toHaveTextContent('4 sessões · 110 min')
    expect(screen.getByTestId('history-window-label')).toHaveTextContent(/^Semana de/)
    expect(rpc).toHaveBeenCalledWith('study_history', {
      p_period: 'week',
      p_anchor: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })

  it('troca o filtro para Dia e consulta o período day', async () => {
    const user = userEvent.setup()
    rpc.mockResolvedValue({ data: dayBuckets(), error: null })

    render(<StudyHistory />)
    await screen.findByTestId('history-summary')

    await user.click(screen.getByRole('button', { name: 'Dia' }))

    expect(await screen.findByTestId('history-summary')).toHaveTextContent('2 sessões · 50 min')
    expect(screen.getByRole('button', { name: 'Dia' })).toHaveAttribute('aria-pressed', 'true')
    expect(rpc).toHaveBeenLastCalledWith('study_history', { p_period: 'day', p_anchor: expect.any(String) })
  })

  it('navega para o próximo período avançando a âncora', async () => {
    const user = userEvent.setup()

    render(<StudyHistory />)
    await screen.findByTestId('history-summary')

    const initialAnchor = rpc.mock.calls[0][1]?.p_anchor as string
    rpc.mockClear()

    await user.click(screen.getByRole('button', { name: 'Próximo período' }))

    await waitFor(() => {
      const lastCall = rpc.mock.calls.at(-1)?.[1] as { p_anchor: string } | undefined
      expect(lastCall?.p_anchor).toBe(addDays(initialAnchor, 7))
    })
  })

  it('mostra estado vazio quando não há minutos no período', async () => {
    rpc.mockResolvedValue({ data: emptyWeekBuckets(), error: null })

    render(<StudyHistory />)

    expect(await screen.findByText('Nenhuma sessão registrada neste período.')).toBeInTheDocument()
  })

  it('exibe erro quando o RPC falha', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    render(<StudyHistory />)

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('refaz o fetch após uma sessão de estudo ser concluída', async () => {
    render(<StudyHistory />)
    await screen.findByTestId('history-summary')

    expect(rpc).toHaveBeenCalledTimes(1)

    act(() => {
      emitStudySessionSaved()
    })

    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(2))
    expect(rpc).toHaveBeenLastCalledWith('study_history', {
      p_period: 'week',
      p_anchor: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })
})