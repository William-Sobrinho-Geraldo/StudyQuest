import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { AuthProvider } from '../features/auth/AuthContext'
import { ShopPage } from './ShopPage'

const { getSession, onAuthStateChange, from, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession, onAuthStateChange },
    from,
    rpc,
  },
}))

const USER_ID = 'user-1'

function makeSlot(overrides: Record<string, unknown> = {}) {
  return {
    slot_1_rarity: 'common',
    slot_1_category: 'weapon',
    slot_1_level: 30,
    slot_1_name: 'Lâmina de Estudo',
    slot_1_attack: 60,
    slot_1_defense: 0,
    slot_1_hp: 0,
    slot_1_price: 240,
    slot_1_bought: false,
    slot_2_rarity: 'rare',
    slot_2_category: 'helmet',
    slot_2_level: 30,
    slot_2_name: 'Elmo do Estudioso',
    slot_2_attack: 0,
    slot_2_defense: 30,
    slot_2_hp: 0,
    slot_2_price: 270,
    slot_2_bought: false,
    slot_3_rarity: 'common',
    slot_3_category: 'boots',
    slot_3_level: 40,
    slot_3_name: 'Botas Simples',
    slot_3_attack: 0,
    slot_3_defense: 40,
    slot_3_hp: 0,
    slot_3_price: 125,
    slot_3_bought: false,
    slot_4_rarity: 'rare',
    slot_4_category: 'chest',
    slot_4_level: 40,
    slot_4_name: 'Peitoral de Estudo',
    slot_4_attack: 0,
    slot_4_defense: 0,
    slot_4_hp: 400,
    slot_4_price: 432,
    slot_4_bought: false,
    slot_5_rarity: 'epic',
    slot_5_category: 'weapon',
    slot_5_level: 50,
    slot_5_name: 'Espada do Grão-Mestre',
    slot_5_attack: 100,
    slot_5_defense: 0,
    slot_5_hp: 0,
    slot_5_price: 1200,
    slot_5_bought: false,
    slot_6_rarity: 'epic',
    slot_6_category: 'chest',
    slot_6_level: 50,
    slot_6_name: 'Armadura Arcanista',
    slot_6_attack: 0,
    slot_6_defense: 0,
    slot_6_hp: 500,
    slot_6_price: 1260,
    slot_6_bought: false,
    refreshes_today: 1,
    next_refresh_at: new Date(Date.now() + 86_400_000).toISOString(),
    ...overrides,
  }
}

let shopRow: Record<string, unknown>
let refreshRows: Record<string, unknown>[]

function mockSupabase() {
  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { level: 35, gold: 500 }, error: null }),
          }),
        }),
      }
    }
    if (table === 'rotating_shop') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: shopRow, error: null }),
          }),
        }),
      }
    }
    return { select: vi.fn() }
  })
}

function setupRpc() {
  rpc.mockImplementation((fn: string) => {
    if (fn === 'refresh_shop') {
      return Promise.resolve({ data: refreshRows, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })
}

function renderShop() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter>
          <ShopPage />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
}

describe('ShopPage — fluxo de atualização do mercado', () => {
  beforeEach(() => {
    shopRow = makeSlot()
    refreshRows = [makeSlot({ next_refresh_at: new Date(Date.now() + 86_400_000).toISOString() })]
    mockSupabase()
    setupRpc()
    getSession.mockResolvedValue({
      data: { session: { user: { id: USER_ID } } },
      error: null,
    })
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
      error: null,
    })
  })

  it('renderiza os 6 slots com a vitrine especial', async () => {
    renderShop()
    expect(await screen.findByText('Lâmina de Estudo')).toBeInTheDocument()
    expect(screen.getAllByText('Vitrine Especial').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId(/shop-slot-/).length).toBe(6)
  })

  it('abre o modal de aceleração quando o timer ainda está ativo', async () => {
    const user = userEvent.setup()
    renderShop()
    await screen.findByText('Lâmina de Estudo')

    const button = screen.getByRole('button', { name: /pular espera/i })
    await user.click(button)

    expect(
      screen.getByText(/ainda está em rotação/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /assistir vídeo/i })).toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalledWith('refresh_shop', expect.anything())
  })

  it('"Voltar a Esperar" fecha o modal sem chamar a rotação', async () => {
    const user = userEvent.setup()
    renderShop()
    await screen.findByText('Lâmina de Estudo')

    await user.click(screen.getByRole('button', { name: /pular espera/i }))
    await user.click(screen.getByRole('button', { name: /voltar a esperar/i }))

    expect(screen.queryByText(/ainda está em rotação/i)).not.toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalledWith('refresh_shop', expect.anything())
  })

  it('"Assistir Vídeo" fecha o modal e executa refresh_shop', async () => {
    const user = userEvent.setup()
    renderShop()
    await screen.findByText('Lâmina de Estudo')

    await user.click(screen.getByRole('button', { name: /pular espera/i }))
    await user.click(screen.getByRole('button', { name: /assistir vídeo/i }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('refresh_shop', { p_player_level: 35 }))
    expect(screen.queryByText(/ainda está em rotação/i)).not.toBeInTheDocument()
  })

  it('executa a rotação diretamente quando o timer já expirou', async () => {
    const user = userEvent.setup()
    shopRow = makeSlot({ next_refresh_at: new Date(Date.now() - 1_000).toISOString() })
    renderShop()
    await screen.findByText('Lâmina de Estudo')

    await user.click(screen.getByRole('button', { name: /atualizar mercado/i }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('refresh_shop', { p_player_level: 35 }))
    expect(screen.queryByText(/ainda está em rotação/i)).not.toBeInTheDocument()
  })

  it('não abre o modal quando o mercado nunca foi sorteado', async () => {
    const user = userEvent.setup()
    shopRow = {
      refresh_1: 0,
      refreshes_today: 0,
      next_refresh_at: new Date(Date.now() - 1_000).toISOString(),
    }
    renderShop()
    await screen.findByText(/ainda não foi aberto hoje/i)

    await user.click(screen.getByRole('button', { name: /sortear itens/i }))

    await waitFor(() => expect(rpc).toHaveBeenCalledWith('refresh_shop', { p_player_level: 35 }))
    expect(screen.queryByText(/ainda está em rotação/i)).not.toBeInTheDocument()
  })
})