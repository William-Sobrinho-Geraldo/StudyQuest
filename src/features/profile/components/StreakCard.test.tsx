import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StreakCard } from './StreakCard'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc },
}))

describe('StreakCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mostra a sequência retornada pelo RPC refresh_streak', async () => {
    rpc.mockResolvedValue({ data: 7, error: null })

    render(<StreakCard />)

    expect(await screen.findByTestId('streak-value')).toHaveTextContent('7')
    expect(screen.getByText('Dias de sequência')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('refresh_streak')
  })

  it('cai para 0 quando o RPC falha', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    render(<StreakCard />)

    await waitFor(() => {
      expect(screen.getByTestId('streak-value')).toHaveTextContent('0')
    })
  })

  it('exibe placeholder enquanto carrega', () => {
    rpc.mockReturnValue(new Promise(() => undefined))

    render(<StreakCard />)

    expect(screen.getByTestId('streak-value')).toHaveTextContent('...')
  })
})