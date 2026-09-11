import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { AuthProvider } from '../features/auth/AuthContext'
import { HistoryPage } from './HistoryPage'
import { emitStudySessionSaved } from '../features/study/lib/studyEvents'
import type { SessionHistoryItem, StudyHistoryBucket } from '../features/metrics/services/studyHistoryService'

const { getSession, onAuthStateChange, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession, onAuthStateChange },
    rpc,
  },
}))

let historyValue: StudyHistoryBucket[] = []
let sessionsValue: SessionHistoryItem[] = []

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

function weekSessions(): SessionHistoryItem[] {
  return [
    { id: 's-4', started_at: '2026-09-13T20:15:00Z', duration_minutes: 45, xp: 55, gold: 25 },
    { id: 's-3', started_at: '2026-09-08T14:30:00Z', duration_minutes: 25, xp: 30, gold: 15 },
    { id: 's-2', started_at: '2026-09-08T14:00:00Z', duration_minutes: 25, xp: 30, gold: 15 },
    { id: 's-1', started_at: '2026-09-07T10:30:00Z', duration_minutes: 15, xp: 20, gold: 10 },
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

function daySessions(): SessionHistoryItem[] {
  return [
    { id: 's-2', started_at: '2026-09-08T14:00:00Z', duration_minutes: 20, xp: 30, gold: 15 },
    { id: 's-1', started_at: '2026-09-08T12:30:00Z', duration_minutes: 30, xp: 40, gold: 20 },
  ]
}

function emptyWeekBuckets(): StudyHistoryBucket[] {
  return weekBuckets().map((bucket) => ({ ...bucket, minutes: 0, sessions: 0 }))
}

function mockRpc() {
  rpc.mockImplementation((fn: string) => {
    if (fn === 'study_history') return Promise.resolve({ data: historyValue, error: null })
    if (fn === 'study_sessions_in_range') return Promise.resolve({ data: sessionsValue, error: null })
    return Promise.resolve({ data: null, error: null })
  })
}

function renderPage() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
}

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
      error: null,
    })
    historyValue = weekBuckets()
    sessionsValue = weekSessions()
    mockRpc()
  })

  it('exibe cabeçalho com botão de voltar e título', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Histórico de estudo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Voltar ao Dashboard' })).toBeInTheDocument()
  })

  it('carrega a semana atual por padrão e resume sessões, minutos, XP e Gold', async () => {
    renderPage()

    const summary = await screen.findByTestId('history-summary')
    expect(summary).toHaveTextContent('4 sessões')
    expect(summary).toHaveTextContent('110 min')
    expect(summary).toHaveTextContent('+135 XP')
    expect(summary).toHaveTextContent('+65 Gold')
    expect(screen.getByTestId('history-window-label')).toHaveTextContent(/^Semana de/)
    expect(rpc).toHaveBeenCalledWith('study_history', {
      p_period: 'week',
      p_anchor: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
    expect(rpc).toHaveBeenCalledWith('study_sessions_in_range', {
      p_period: 'week',
      p_anchor: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })

  it('lista as sessões do período quando expandido', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByTestId('history-summary')

    const toggle = screen.getByRole('button', { name: /sessões do período/i })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    // Recolhida por padrão: o conteúdo não está no DOM.
    expect(screen.queryByText('13/09 às 17:15')).not.toBeInTheDocument()

    await user.click(toggle)

    expect(screen.getByRole('button', { name: /sessões do período/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getAllByText('Sessões do período').length).toBeGreaterThan(0)
    expect(screen.getByText('13/09 às 17:15')).toBeInTheDocument()
    expect(screen.getByText('08/09 às 11:00')).toBeInTheDocument()
    expect(screen.getByText('08/09 às 11:30')).toBeInTheDocument()
    expect(screen.getByText('07/09 às 07:30')).toBeInTheDocument()
    expect(screen.getByText('+55 XP')).toBeInTheDocument()
    expect(screen.getByText('+25 Gold')).toBeInTheDocument()
  })

  it('troca o filtro para Dia e consulta o período day', async () => {
    const user = userEvent.setup()
    historyValue = dayBuckets()
    sessionsValue = daySessions()
    mockRpc()

    renderPage()
    await screen.findByTestId('history-summary')

    await user.click(screen.getByRole('button', { name: 'Dia' }))

    const summary = await screen.findByTestId('history-summary')
    expect(summary).toHaveTextContent('2 sessões')
    expect(summary).toHaveTextContent('50 min')
    expect(summary).toHaveTextContent('+70 XP')
    expect(summary).toHaveTextContent('+35 Gold')
    expect(screen.getByRole('button', { name: 'Dia' })).toHaveAttribute('aria-pressed', 'true')
    expect(rpc).toHaveBeenLastCalledWith('study_sessions_in_range', {
      p_period: 'day',
      p_anchor: expect.any(String),
    })
  })

  it('navega para o próximo período avançando a âncora', async () => {
    const user = userEvent.setup()

    renderPage()
    await screen.findByTestId('history-summary')

    const historyCalls = rpc.mock.calls.filter(([fn]) => fn === 'study_history')
    const initialAnchor = historyCalls[0][1]?.p_anchor as string
    rpc.mockClear()
    mockRpc()

    await user.click(screen.getByRole('button', { name: 'Próximo período' }))

    await waitFor(() => {
      const historyCallsNow = rpc.mock.calls.filter(([fn]) => fn === 'study_history')
      const lastCall = historyCallsNow.at(-1)?.[1] as { p_anchor: string } | undefined
      expect(lastCall?.p_anchor).toBe(addDays(initialAnchor, 7))
    })
  })

  it('mostra estado vazio quando não há minutos no período', async () => {
    historyValue = emptyWeekBuckets()
    sessionsValue = []
    mockRpc()

    renderPage()

    expect(await screen.findByText('Nenhuma sessão registrada neste período.')).toBeInTheDocument()
    expect(screen.queryByText('Sessões do período')).not.toBeInTheDocument()
  })

  it('exibe erro quando o RPC falha', async () => {
    historyValue = []
    sessionsValue = []
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('refaz o fetch após uma sessão de estudo ser concluída', async () => {
    renderPage()
    await screen.findByTestId('history-summary')

    const initialHistoryCalls = () => rpc.mock.calls.filter(([fn]) => fn === 'study_history')
    expect(initialHistoryCalls()).toHaveLength(1)

    act(() => {
      emitStudySessionSaved()
    })

    await waitFor(() => expect(initialHistoryCalls()).toHaveLength(2))
    expect(rpc).toHaveBeenLastCalledWith('study_sessions_in_range', {
      p_period: 'week',
      p_anchor: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    })
  })
})