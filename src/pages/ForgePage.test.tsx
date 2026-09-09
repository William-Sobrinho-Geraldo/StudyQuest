import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../features/auth/AuthContext'
import { FORGE_STORAGE_KEY } from '../features/forge/hooks/useForge'
import { MAX_REFINE_LEVEL } from '../features/forge/lib/forgeRules'
import { ForgePage } from './ForgePage'

const { getSession, onAuthStateChange, from } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: { getSession, onAuthStateChange },
    from,
  },
}))

const USER_ID = 'user-1'

function seedLevels(levels: { weapon: number }) {
  window.localStorage.setItem(FORGE_STORAGE_KEY, JSON.stringify(levels))
}

function mockProfileGold(gold: number) {
  from.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: { gold }, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  })
}

function updateBuilders() {
  return from.mock.results
    .map((result) => result.value)
    .filter(
      (builder) =>
        typeof builder?.update === 'function' && builder.update.mock.calls.length > 0,
    )
}

function renderForge() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <ForgePage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

async function renderReadyForge() {
  renderForge()
  await waitFor(() => expect(screen.getByTestId('forge-gold')).not.toHaveTextContent('...'))
  return screen.getByTestId('forge-gold')
}

describe('ForgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    getSession.mockResolvedValue({
      data: { session: { user: { id: USER_ID } } },
      error: null,
    })
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
      error: null,
    })
    mockProfileGold(10_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('exibe o saldo de gold e os 4 slots de equipamento com suas chances e custos', async () => {
    renderForge()

    await waitFor(() => expect(screen.getByTestId('forge-gold')).not.toHaveTextContent('...'))
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('10000 Gold')
    expect(screen.getByText('Arma')).toBeInTheDocument()
    expect(screen.getByText('Elmo')).toBeInTheDocument()
    expect(screen.getByText('Peitoral')).toBeInTheDocument()
    expect(screen.getByText('Botas')).toBeInTheDocument()
    expect(screen.getAllByText(/Chance:/)).toHaveLength(4)
    expect(screen.getAllByText(/Custo:/)).toHaveLength(4)
  })

  it('refina com sucesso quando o rand fica abaixo da taxa (+5 -> +6)', async () => {
    seedLevels({ weapon: 5 })
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    await renderReadyForge()

    fireEvent.click(screen.getByRole('button', { name: 'Refinar Arma de +5 para +6' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Sucesso! Arma +5 → +6')
    expect(screen.getByTestId('forge-level-weapon')).toHaveTextContent('+6')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9840 Gold')

    const updateBuilder = updateBuilders()[0]
    expect(updateBuilder.update).toHaveBeenCalledWith({ gold: 9840 })
    expect(updateBuilder.update.mock.results[0].value.eq).toHaveBeenCalledWith('id', USER_ID)

    const persisted = JSON.parse(window.localStorage.getItem(FORGE_STORAGE_KEY) ?? '{}')
    expect(persisted.weapon).toBe(6)
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('aplica a regressão de nível na falha quando o rand passa da taxa (+5 -> +4)', async () => {
    seedLevels({ weapon: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    await renderReadyForge()

    fireEvent.click(screen.getByRole('button', { name: 'Refinar Arma de +5 para +6' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha! Arma +5 → +4')
    expect(screen.getByTestId('forge-level-weapon')).toHaveTextContent('+4')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9840 Gold')
    expect(updateBuilders()[0].update).toHaveBeenCalledWith({ gold: 9840 })
  })

  it('não bloqueia +0 -> +1 mesmo com rand altíssimo (zona segura 100%)', async () => {
    seedLevels({ weapon: 0 })
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999)
    await renderReadyForge()

    fireEvent.click(screen.getByRole('button', { name: 'Refinar Arma de +0 para +1' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Sucesso! Arma +0 → +1')
    expect(screen.getByTestId('forge-level-weapon')).toHaveTextContent('+1')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9975 Gold')
  })

  it('bloqueia a tentativa quando o saldo não cobre o custo e mantém o nível', async () => {
    seedLevels({ weapon: 5 })
    mockProfileGold(100)
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    await renderReadyForge()

    const refineButton = screen.getByRole('button', { name: 'Refinar Arma de +5 para +6' })
    expect(refineButton).toBeDisabled()
    expect(screen.getByText('Gold insuficiente para esta tentativa.')).toBeInTheDocument()

    fireEvent.click(refineButton)

    await waitFor(() => {
      expect(screen.getByTestId('forge-level-weapon')).toHaveTextContent('+5')
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(updateBuilders()).toHaveLength(0)
  })

  it('desabilita o botão no refino máximo (+12)', async () => {
    seedLevels({ weapon: MAX_REFINE_LEVEL })
    await renderReadyForge()

    const maxButton = screen.getByRole('button', { name: 'Refinar Arma (máximo)' })
    expect(maxButton).toBeDisabled()
    expect(screen.getByText(`Máximo (+${MAX_REFINE_LEVEL})`)).toBeInTheDocument()
  })

  it('falha ao persistir o gold reverte o nível e restaura o saldo', async () => {
    seedLevels({ weapon: 5 })
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: { gold: 10_000 }, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi
          .fn()
          .mockResolvedValue({ data: null, error: { message: 'update falhou' } }),
      }),
    })
    await renderReadyForge()

    fireEvent.click(screen.getByRole('button', { name: 'Refinar Arma de +5 para +6' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('update falhou')
    expect(screen.getByTestId('forge-level-weapon')).toHaveTextContent('+5')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('10000 Gold')
    const persisted = JSON.parse(window.localStorage.getItem(FORGE_STORAGE_KEY) ?? '{}')
    expect(persisted.weapon).toBe(5)
  })
})