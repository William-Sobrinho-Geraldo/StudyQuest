import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'
import { RewardChestCard } from './RewardChestCard'

const { getSession, onAuthStateChange, from, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange }, from, rpc },
}))

const NOW = new Date('2026-09-09T12:00:00.000Z')

const SESSION = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: 'bearer',
  user: {
    id: 'user-chest',
    email: 'bau@teste.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  },
} satisfies Session

function mockLastClaim(minutesAgo: number) {
  from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: { last_chest_claim: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString() },
          error: null,
        }),
      }),
    }),
  })
}

function mockSession() {
  getSession.mockResolvedValue({ data: { session: SESSION }, error: null })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
}

async function flush(): Promise<void> {
  await act(async () => undefined)
}

function renderCard(onClaimed?: () => void) {
  render(
    <AuthProvider>
      <RewardChestCard onClaimed={onClaimed} />
    </AuthProvider>,
  )
}

describe('RewardChestCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.clearAllMocks()
    mockSession()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mostra valores proporcionais a 4 horas acumuladas com o botão habilitado', async () => {
    mockLastClaim(240)

    renderCard()
    await flush()

    expect(screen.getByTestId('chest-xp')).toHaveTextContent('500 / 1.000 XP')
    expect(screen.getByTestId('chest-gold')).toHaveTextContent('150 / 300 Gold')
    expect(screen.getByTestId('chest-elapsed')).toHaveTextContent('4h 0m 0s')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50')
    expect(screen.getByRole('button', { name: 'Reivindicar' })).toBeEnabled()
  })

  it('desabilita o botão com menos de 1 minuto acumulado', async () => {
    mockLastClaim(0)

    renderCard()
    await flush()

    expect(screen.getByTestId('chest-xp')).toHaveTextContent('0 / 1.000 XP')
    expect(screen.getByTestId('chest-gold')).toHaveTextContent('0 / 300 Gold')
    expect(screen.getByTestId('chest-elapsed')).toHaveTextContent('0s')
    expect(screen.getByRole('button', { name: 'Reivindicar' })).toBeDisabled()
  })

  it('mostra o baú cheio no teto de 8 horas', async () => {
    mockLastClaim(480)

    renderCard()
    await flush()

    expect(screen.getByTestId('chest-xp')).toHaveTextContent('1.000 / 1.000 XP')
    expect(screen.getByTestId('chest-gold')).toHaveTextContent('300 / 300 Gold')
    expect(screen.getByTestId('chest-elapsed')).toHaveTextContent('8h 0m 0s')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('Baú cheio!')).toBeInTheDocument()
  })

  it('congela o contador em 8h mesmo após muitas horas acumuladas', async () => {
    mockLastClaim(24 * 60)

    renderCard()
    await flush()

    expect(screen.getByTestId('chest-elapsed')).toHaveTextContent('8h 0m 0s')
    expect(screen.getByTestId('chest-xp')).toHaveTextContent('1.000 / 1.000 XP')
    expect(screen.getByText('Baú cheio!')).toBeInTheDocument()
  })

  it('não exibe o rodapé com o teto em texto nem o prefixo "Desde a última reivindicação"', async () => {
    mockLastClaim(240)

    renderCard()
    await flush()

    expect(screen.queryByText(/Máximo em 480 min/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Desde a última reivindicação/)).not.toBeInTheDocument()
    expect(screen.getByTestId('chest-elapsed')).toHaveTextContent('4h 0m 0s')
  })

  it('reivindica via RPC e zera o baú após o claim', async () => {
    mockLastClaim(480)
    rpc.mockResolvedValue({ data: null, error: null })

    renderCard()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Reivindicar' }))
    await flush()

    expect(rpc).toHaveBeenCalledWith('claim_chest_reward')
    expect(screen.getByTestId('chest-xp')).toHaveTextContent('0 / 1.000 XP')
    expect(screen.getByTestId('chest-gold')).toHaveTextContent('0 / 300 Gold')
    expect(screen.getByTestId('chest-elapsed')).toHaveTextContent('0s')
    expect(screen.getByRole('button', { name: 'Reivindicar' })).toBeDisabled()
  })

  it('chama onClaimed após reivindicar com sucesso', async () => {
    const onClaimed = vi.fn()
    mockLastClaim(240)
    rpc.mockResolvedValue({ data: null, error: null })

    renderCard(onClaimed)
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Reivindicar' }))
    await flush()

    expect(onClaimed).toHaveBeenCalledTimes(1)
  })

  it('atualiza sozinho a cada segundo sem novas requisições (optimistic UI)', async () => {
    mockLastClaim(478)

    renderCard()
    await flush()

    expect(screen.getByTestId('chest-xp')).toHaveTextContent('995 / 1.000 XP')
    expect(screen.getByTestId('chest-gold')).toHaveTextContent('298 / 300 Gold')
    expect(screen.getByTestId('chest-elapsed')).toHaveTextContent('7h 58m 0s')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '99')

    act(() => {
      vi.advanceTimersByTime(120_000)
    })

    expect(screen.getByTestId('chest-xp')).toHaveTextContent('1.000 / 1.000 XP')
    expect(screen.getByTestId('chest-gold')).toHaveTextContent('300 / 300 Gold')
    expect(screen.getByTestId('chest-elapsed')).toHaveTextContent('8h 0m 0s')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    expect(screen.getByText('Baú cheio!')).toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('reporta erro quando o RPC de claim falha', async () => {
    mockLastClaim(240)
    rpc.mockResolvedValue({ data: null, error: { message: 'sem recompensas' } })

    renderCard()
    await flush()

    fireEvent.click(screen.getByRole('button', { name: 'Reivindicar' }))
    await flush()

    expect(screen.getByRole('alert')).toHaveTextContent('sem recompensas')
  })
})