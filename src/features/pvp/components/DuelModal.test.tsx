import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'
import { DuelModal } from './DuelModal'

const { getSession, onAuthStateChange, from, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getSession, onAuthStateChange },
    from,
    rpc,
  },
}))

const USER_ID = 'user-1'
const DEFENDER_ID = 'user-2'

function mockSession() {
  getSession.mockResolvedValue({
    data: { session: { user: { id: USER_ID, email: 'hero@studyquest.dev' } } },
    error: null,
  })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
}

function mockProfiles() {
  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: USER_ID, display_name: 'Heroi', avatar_id: null },
              error: null,
            }),
          }),
        }),
      }
    }
    return { select: vi.fn() }
  })
}

function renderDuel(onClose: () => void = vi.fn()) {
  return render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <DuelModal
          defenderId={DEFENDER_ID}
          defenderName="Rival"
          defenderAvatarId={null}
          onClose={onClose}
        />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function flush() {
  await act(async () => {
    for (let i = 0; i < 6; i++) {
      await Promise.resolve()
    }
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSession()
  mockProfiles()
  rpc.mockImplementation((fn: string) => {
    if (fn === 'execute_duel') {
      return Promise.resolve({
        data: {
          winner_id: USER_ID,
          attacker_power: 120,
          defender_power: 90,
          honor_earned: 10,
        },
        error: null,
      })
    }
    return Promise.resolve({ data: null, error: null })
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DuelModal', () => {
  it('dispara execute_duel e revela VITÓRIA com a honra após o tempo de batalha', async () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    renderDuel(onClose)

    expect(screen.getByText('VS')).toBeInTheDocument()

    await flush()
    expect(rpc).toHaveBeenCalledWith('execute_duel', {
      p_attacker_id: USER_ID,
      p_defender_id: DEFENDER_ID,
    })

    await act(async () => {
      vi.advanceTimersByTime(2500)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('VITÓRIA!')).toBeInTheDocument()
    expect(screen.getByText('+10 Honra')).toBeInTheDocument()

    await act(async () => {
      screen.getByRole('button', { name: 'Sair da Arena' }).click()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('exibe DERROTA quando o vencedor é o defensor', async () => {
    vi.useFakeTimers()
    rpc.mockImplementation((fn: string) => {
      if (fn === 'execute_duel') {
        return Promise.resolve({
          data: {
            winner_id: DEFENDER_ID,
            attacker_power: 80,
            defender_power: 120,
            honor_earned: 5,
          },
          error: null,
        })
      }
      return Promise.resolve({ data: null, error: null })
    })

    renderDuel()
    await flush()
    await act(async () => {
      vi.advanceTimersByTime(2500)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('DERROTA')).toBeInTheDocument()
    expect(screen.getByText(/se defendeu com sucesso/i)).toBeInTheDocument()
  })

  it('mostra erro quando a RPC falha', async () => {
    vi.useFakeTimers()
    rpc.mockImplementation(() => Promise.resolve({ data: null, error: { message: 'rate limit' } }))

    renderDuel()
    await flush()
    await act(async () => {
      vi.advanceTimersByTime(2500)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('Duelo indisponível')).toBeInTheDocument()
  })
})
