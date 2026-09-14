import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { AuthProvider } from '../features/auth/AuthContext'
import { EQUIPMENT_STORAGE_KEY, type GearInventoryRow, type InventoryRow } from '../features/forge/lib/forgeItems'
import { MAX_REFINE_LEVEL, SLOTS, type EquipmentSlot } from '../features/forge/lib/forgeRules'
import { ForgePage } from './ForgePage'

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

const rewardedAd = vi.hoisted(() => ({
  isAdReady: true,
  showAd: vi.fn(),
  loadAd: vi.fn(),
}))

vi.mock('../hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    isAdReady: rewardedAd.isAdReady,
    isLoading: false,
    showAd: rewardedAd.showAd,
    loadAd: rewardedAd.loadAd,
  }),
}))

const USER_ID = 'user-1'

let goldValue: number
let characterLevelValue: number
let inventoryRows: InventoryRow[]
let insertResultRows: InventoryRow[]
let updateError: { message: string } | null
let rpcError: { message: string } | null
let openChestResult: InventoryRow[]
let startForgeResult: InventoryRow | null
let reduceForgeResult: InventoryRow | null
let collectForgeResult: InventoryRow | null

interface Capture {
  profileUpdatePatches: unknown[]
  inventoryUpdatePatches: unknown[]
  inventoryInsertCalls: unknown[]
}

function makeGear(
  id: string,
  slot: EquipmentSlot,
  name: string,
  enhancementLevel = 0,
  equipped = false,
  itemLevel = 10,
  forge: { is_in_forge?: boolean; forge_ends_at?: string | null } = {},
): GearInventoryRow {
  return {
    id,
    user_id: USER_ID,
    item_category: slot,
    rarity: 'common',
    name,
    item_level: itemLevel,
    enhancement_level: enhancementLevel,
    quantity: 1,
    equipped,
    is_in_forge: forge.is_in_forge ?? false,
    forge_ends_at: forge.forge_ends_at ?? null,
  }
}

function makeChest(id: string, rarity: 'common' | 'rare' | 'epic', quantity: number): InventoryRow {
  return {
    id,
    user_id: USER_ID,
    item_category: 'supply_chest',
    rarity,
    name: null,
    item_level: 0,
    enhancement_level: 0,
    quantity,
    equipped: false,
  }
}

function forgeRows(weaponEnhancement = 0): InventoryRow[] {
  return [
    makeGear('weapon-eq', 'weapon', 'Espada do Aprendiz', weaponEnhancement, true),
    makeGear('helmet-eq', 'helmet', 'Elmo do Estudante', 0, true),
    makeGear('chest-eq', 'chest', 'Peitoral do Aprendiz', 0, true),
    makeGear('boots-eq', 'boots', 'Botas do Peregrino', 0, true),
  ]
}

function mockSupabase(capture: Capture) {
  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn((columns: string) => {
          const data =
            columns.includes('level') && !columns.includes('gold')
              ? { level: characterLevelValue }
              : { gold: goldValue }
          return {
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
            }),
          }
        }),
        update: vi.fn((patch: unknown) => {
          capture.profileUpdatePatches.push(patch)
          return { eq: vi.fn().mockResolvedValue({ data: null, error: updateError }) }
        }),
      }
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: inventoryRows, error: null }),
      }),
      insert: vi.fn((rows: unknown) => {
        capture.inventoryInsertCalls.push(rows)
        return {
          select: vi.fn().mockResolvedValue({ data: insertResultRows, error: null }),
        }
      }),
      update: vi.fn((patch: unknown) => {
        capture.inventoryUpdatePatches.push(patch)
        return { eq: vi.fn().mockResolvedValue({ data: null, error: updateError }) }
      }),
    }
  })
}

function setupRpc() {
  rpc.mockImplementation((fn: string, args: Record<string, unknown>) => {
    if (rpcError) {
      return Promise.resolve({ data: null, error: rpcError })
    }
    if (fn === 'start_forge_refinement') {
      const id = args.p_inventory_id as string
      const row = inventoryRows.find((r) => r.id === id)
      const result =
        startForgeResult ??
        (row
          ? {
              ...row,
              is_in_forge: true,
              forge_ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            }
          : null)
      return Promise.resolve({ data: result ? [result] : [], error: null })
    }
    if (fn === 'reduce_forge_time_ad') {
      const id = args.p_inventory_id as string
      const row = inventoryRows.find((r) => r.id === id)
      const result =
        reduceForgeResult ??
        (row
          ? {
              ...row,
              is_in_forge: true,
              forge_ends_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
            }
          : null)
      return Promise.resolve({ data: result ? [result] : [], error: null })
    }
    if (fn === 'collect_forged_item' || fn === 'complete_forge_now') {
      const id = args.p_inventory_id as string
      const row = inventoryRows.find((r) => r.id === id)
      const result =
        collectForgeResult ??
        (row
          ? {
              ...row,
              enhancement_level: row.enhancement_level + 1,
              is_in_forge: false,
              forge_ends_at: null,
            }
          : null)
      return Promise.resolve({ data: result ? [result] : [], error: null })
    }
    if (fn === 'open_inventory_chest') {
      return Promise.resolve({ data: openChestResult, error: null })
    }
    return Promise.resolve({ data: null, error: null })
  })
}

function setupSut(capture: Capture) {
  mockSupabase(capture)
  setupRpc()
  getSession.mockResolvedValue({
    data: { session: { user: { id: USER_ID } } },
    error: null,
  })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
}

function renderForge() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter>
          <ForgePage />
        </MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  )
}

async function renderReadyForge() {
  renderForge()
  await waitFor(() => expect(screen.getByTestId('forge-gold')).not.toHaveTextContent('...'))
  return screen.getByTestId('forge-gold')
}

// A interação primária é o toque: abre o modal de detalhes do item.
function tapCard(card: HTMLElement) {
  fireEvent.click(card)
}

function sendToAnvil(card: HTMLElement) {
  tapCard(card)
  fireEvent.click(screen.getByRole('button', { name: /enviar para bigorna/i }))
}

function equipFromModal(card: HTMLElement) {
  tapCard(card)
  fireEvent.click(screen.getByRole('button', { name: /equipar/i }))
}

describe('ForgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    goldValue = 10_000
    characterLevelValue = 100
    inventoryRows = []
    insertResultRows = []
    updateError = null
    rpcError = null
    openChestResult = []
    startForgeResult = null
    reduceForgeResult = null
    collectForgeResult = null
    rewardedAd.isAdReady = true
    rewardedAd.showAd.mockClear()
    rewardedAd.loadAd.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  const emptyCapture = (): Capture => ({
    profileUpdatePatches: [],
    inventoryUpdatePatches: [],
    inventoryInsertCalls: [],
  })

  it('exibe o saldo de gold, o paperdoll equipado e o inventário sobressalente', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    expect(screen.getByTestId('forge-gold')).toHaveTextContent('10000 Gold')
    expect(screen.getByTestId('forge-character-level')).toHaveTextContent('100')

    for (const slot of SLOTS) {
      const slotCard = screen.getByTestId(`equipment-slot-${slot}`)
      expect(slotCard).toBeInTheDocument()
      expect(
        slotCard.querySelector('[data-testid="item-enhancement"]'),
      ).not.toBeInTheDocument()
    }
    fireEvent.mouseEnter(screen.getByTestId('equipment-slot-weapon'))
    expect(
      screen.getByTestId('equipment-slot-weapon-tooltip'),
    ).toHaveTextContent('Espada do Aprendiz')
    fireEvent.mouseEnter(screen.getByTestId('equipment-slot-helmet'))
    expect(
      screen.getByTestId('equipment-slot-helmet-tooltip'),
    ).toHaveTextContent('Elmo do Estudante')

    fireEvent.mouseEnter(screen.getByTestId('inventory-item-spare-helmet-0'))
    expect(
      screen.getByTestId('inventory-item-spare-helmet-0-tooltip'),
    ).toHaveTextContent('Coifa de Saber')
    expect(screen.getByTestId('inventory-count')).toHaveTextContent('1 / 24 itens')
  })

  it('enviar item equipado para a bigorna mostra custo, tempo e botão habilitado', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    sendToAnvil(screen.getByTestId('equipment-slot-weapon'))

    const summary = screen.getByTestId('anvil-selected-item')
    expect(summary).toHaveTextContent('Arma pronto para refino')
    expect(summary).toHaveTextContent('Espada do Aprendiz')
    expect(summary).toHaveTextContent('160 Gold')
    expect(summary).toHaveTextContent('24h')

    const startButton = screen.getByRole('button', {
      name: 'Iniciar Refino Espada do Aprendiz de +5 para +6',
    })
    expect(startButton).toBeEnabled()
    expect(startButton).toHaveTextContent('Iniciar Refino +5 → +6')
  })

  it('enviar item do inventário para a bigorna prepara-o para iniciar o refino', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    sendToAnvil(screen.getByTestId('inventory-item-spare-helmet-0'))

    const summary = screen.getByTestId('anvil-selected-item')
    expect(summary).toHaveTextContent('Elmo pronto para refino')
    expect(summary).toHaveTextContent('Coifa de Saber')
    expect(summary).toHaveTextContent('5 min')
    expect(
      screen.getByRole('button', { name: 'Iniciar Refino Coifa de Saber de +0 para +1' }),
    ).toBeEnabled()
  })

  it('iniciar refino cobra o gold e ocupa a bigorna com o timer', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    sendToAnvil(screen.getByTestId('equipment-slot-weapon'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Iniciar Refino Espada do Aprendiz de +0 para +1' }),
    )

    expect(await screen.findByLabelText('Refino em andamento')).toBeInTheDocument()
    expect(rpc).toHaveBeenCalledWith('start_forge_refinement', {
      p_inventory_id: 'weapon-eq',
    })
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9975 Gold')
    expect(screen.getByTestId('forge-countdown')).toBeInTheDocument()
  })

  it('mostra painel de refino com contador e botão de anúncio quando há item na bigorna', async () => {
    inventoryRows = [
      ...forgeRows(),
      makeGear('forging-helmet', 'helmet', 'Coifa de Saber', 0, false, 10, {
        is_in_forge: true,
        forge_ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    expect(screen.getByLabelText('Refino em andamento')).toBeInTheDocument()
    expect(screen.getByTestId('forge-countdown')).toBeInTheDocument()
    expect(screen.getByTestId('forge-watch-ad-button')).toHaveTextContent(
      'Assistir Anúncio (-25% tempo)',
    )
    expect(screen.queryByTestId('anvil-empty-state')).not.toBeInTheDocument()
  })

  it('assistir anúncio reduz o tempo restante via reduce_forge_time_ad', async () => {
    rewardedAd.showAd.mockImplementationOnce((onSuccess: () => void) => {
      onSuccess()
    })
    inventoryRows = [
      ...forgeRows(),
      makeGear('forging-helmet', 'helmet', 'Coifa de Saber', 0, false, 10, {
        is_in_forge: true,
        forge_ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    fireEvent.click(screen.getByTestId('forge-watch-ad-button'))

    await waitFor(
      () =>
        expect(rpc).toHaveBeenCalledWith('reduce_forge_time_ad', {
          p_inventory_id: 'forging-helmet',
        }),
      { timeout: 3000 },
    )
  })

  it('desabilita o botão de anúncio e mostra carregando quando o anúncio não está pronto', async () => {
    rewardedAd.isAdReady = false
    inventoryRows = [
      ...forgeRows(),
      makeGear('forging-helmet', 'helmet', 'Coifa de Saber', 0, false, 10, {
        is_in_forge: true,
        forge_ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    const button = screen.getByTestId('forge-watch-ad-button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Carregando anúncio...')
  })

  it('mostra Coletar Item quando o tempo acaba e libera a bigorna ao coletar', async () => {
    inventoryRows = [
      ...forgeRows(),
      makeGear('forging-helmet', 'helmet', 'Coifa de Saber', 3, false, 10, {
        is_in_forge: true,
        forge_ends_at: new Date(Date.now() - 1000).toISOString(),
      }),
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    expect(screen.getByTestId('forge-collect-button')).toBeInTheDocument()
    expect(screen.queryByTestId('forge-countdown')).not.toBeInTheDocument()
    expect(screen.queryByTestId('forge-watch-ad-button')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('forge-collect-button'))

    expect(rpc).toHaveBeenCalledWith('collect_forged_item', {
      p_inventory_id: 'forging-helmet',
    })

    await waitFor(() => {
      expect(screen.getByTestId('inventory-item-forging-helmet')).toHaveTextContent('+4')
    })
    expect(screen.getByTestId('anvil-empty-state')).toBeInTheDocument()
  })

  it('botão discreto conclui o refino automaticamente', async () => {
    inventoryRows = [
      ...forgeRows(),
      makeGear('forging-helmet', 'helmet', 'Coifa de Saber', 3, false, 10, {
        is_in_forge: true,
        forge_ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    fireEvent.click(screen.getByTestId('complete-forge-now'))

    expect(rpc).toHaveBeenCalledWith('complete_forge_now', {
      p_inventory_id: 'forging-helmet',
    })

    await waitFor(() => {
      expect(screen.getByTestId('inventory-item-forging-helmet')).toHaveTextContent('+4')
    })
    expect(screen.getByTestId('anvil-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('complete-forge-now')).not.toBeInTheDocument()
  })

  it('bloqueia iniciar refino quando o saldo não cobre o custo', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    goldValue = 100
    setupSut(emptyCapture())
    await renderReadyForge()

    sendToAnvil(screen.getByTestId('equipment-slot-weapon'))

    const startButton = screen.getByRole('button', {
      name: 'Iniciar Refino Espada do Aprendiz de +5 para +6',
    })
    expect(startButton).toBeDisabled()
    expect(screen.getByText('Gold insuficiente para iniciar o refino.')).toBeInTheDocument()

    fireEvent.click(startButton)

    expect(screen.queryByLabelText('Refino em andamento')).not.toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalledWith('start_forge_refinement', expect.anything())
  })

  it('desabilita o botão no refino máximo (+12)', async () => {
    inventoryRows = [...forgeRows(MAX_REFINE_LEVEL), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    sendToAnvil(screen.getByTestId('equipment-slot-weapon'))

    const maxButton = screen.getByRole('button', { name: 'Refinar Espada do Aprendiz (máximo)' })
    expect(maxButton).toBeDisabled()
    expect(maxButton).toHaveTextContent(`Máximo (+${MAX_REFINE_LEVEL})`)
  })

  it('falha ao iniciar o refino na RPC restaura o saldo', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    rpcError = { message: 'update falhou' }
    setupSut(emptyCapture())
    await renderReadyForge()

    sendToAnvil(screen.getByTestId('equipment-slot-weapon'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Iniciar Refino Espada do Aprendiz de +5 para +6' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('update falhou')
    expect(screen.queryByLabelText('Refino em andamento')).not.toBeInTheDocument()
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('10000 Gold')
  })

  it('equipar item do inventário devolve o antigo ao inventário', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-weapon-0', 'weapon', 'Lâmina de Estudo')]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    equipFromModal(screen.getByTestId('inventory-item-spare-weapon-0'))

    await waitFor(() => {
      fireEvent.mouseEnter(screen.getByTestId('equipment-slot-weapon'))
      expect(
        screen.getByTestId('equipment-slot-weapon-tooltip'),
      ).toHaveTextContent('Lâmina de Estudo')
    })
    fireEvent.mouseEnter(screen.getByTestId('inventory-item-weapon-eq'))
    expect(
      screen.getByTestId('inventory-item-weapon-eq-tooltip'),
    ).toHaveTextContent('Espada do Aprendiz')
    expect(screen.getByTestId('inventory-count')).toHaveTextContent('1 / 24 itens')
    expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: false })
    expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: true })
  })

  it('equipa item do inventário no slot correspondente', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Elmo de Ferro', 0, false)]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    equipFromModal(screen.getByTestId('inventory-item-spare-helmet-0'))

    await waitFor(() =>
      expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: true }),
    )
    expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: false })
    expect(screen.queryByTestId('inventory-item-spare-helmet-0')).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('equipment-slot-helmet'))
    expect(screen.getByTestId('equipment-slot-helmet-tooltip')).toHaveTextContent('Elmo de Ferro')
  })

  it('troca a bota equipada ao equipar uma nova bota', async () => {
    inventoryRows = [
      ...forgeRows(),
      makeGear('spare-boots-0', 'boots', 'Botas do Andarilho', 0, false),
    ]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    equipFromModal(screen.getByTestId('inventory-item-spare-boots-0'))

    await waitFor(() =>
      expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: true }),
    )
    expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: false })

    const unequipIndex = capture.inventoryUpdatePatches.findIndex(
      (patch) => (patch as { equipped?: boolean }).equipped === false,
    )
    const equipIndex = capture.inventoryUpdatePatches.findIndex(
      (patch) => (patch as { equipped?: boolean }).equipped === true,
    )
    expect(unequipIndex).toBeGreaterThanOrEqual(0)
    expect(equipIndex).toBeGreaterThanOrEqual(0)
    expect(unequipIndex).toBeLessThan(equipIndex)

    expect(screen.queryByTestId('inventory-item-spare-boots-0')).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('equipment-slot-boots'))
    expect(screen.getByTestId('equipment-slot-boots-tooltip')).toHaveTextContent(
      'Botas do Andarilho',
    )
    fireEvent.mouseEnter(screen.getByTestId('inventory-item-boots-eq'))
    expect(screen.getByTestId('inventory-item-boots-eq-tooltip')).toHaveTextContent(
      'Botas do Peregrino',
    )
  })

  it('item acima do nível fica bloqueado no inventário (sem selecionar ou refinar)', async () => {
    characterLevelValue = 15
    inventoryRows = [
      ...forgeRows(),
      makeGear('spare-high-0', 'helmet', 'Coifa de Saber', 0, false, 20),
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    const cell = screen.getByTestId('inventory-item-spare-high-0')
    fireEvent.mouseEnter(cell)
    expect(screen.getByTestId('inventory-item-spare-high-0-tooltip')).toHaveTextContent(
      'Requer Nível 20',
    )
    expect(cell.getAttribute('aria-label')).toContain('bloqueado')

    expect(screen.getByTestId('anvil-empty-state')).toBeInTheDocument()
    expect(screen.queryByTestId('anvil-selected-item')).not.toBeInTheDocument()
  })

  it('item acima do nível abre detalhes com Equipar bloqueado e Vender liberado', async () => {
    characterLevelValue = 15
    inventoryRows = [
      ...forgeRows(),
      makeGear('spare-high-0', 'weapon', 'Machado de Guerra', 0, false, 30),
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    tapCard(screen.getByTestId('inventory-item-spare-high-0'))

    expect(screen.getByRole('heading', { name: 'Machado de Guerra' })).toBeInTheDocument()
    expect(screen.getByText('Requer Nível 30 para equipar.')).toBeInTheDocument()

    const equipButton = screen.getByRole('button', { name: /Equipar/ })
    expect(equipButton).toBeDisabled()

    const sellButton = screen.getByRole('button', { name: /Vender por/ })
    expect(sellButton).toBeEnabled()
  })

  it('abre um baú, consome a quantidade e adiciona o equipamento ao inventário', async () => {
    inventoryRows = [...forgeRows(), makeChest('chest-rare-1', 'rare', 2)]
    openChestResult = [
      {
        id: 'loot-1',
        user_id: USER_ID,
        item_category: 'weapon',
        rarity: 'rare',
        name: 'Cimitarra do Foco',
        item_level: 70,
        enhancement_level: 0,
        quantity: 1,
        equipped: false,
      },
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    const chestCard = screen.getByTestId('supply-chest-rare')
    expect(chestCard).toHaveTextContent('Baú Raro')
    expect(chestCard).toHaveTextContent('Quantidade: 2')

    fireEvent.click(screen.getByRole('button', { name: 'Abrir baú Raro' }))

    expect(rpc).toHaveBeenCalledWith('open_inventory_chest', {
      p_inventory_id: 'chest-rare-1',
      p_character_level: 100,
    })
    expect(
      await screen.findByText(
        'Você abriu um Baú Raro e recebeu Cimitarra do Foco (Nível 70)!',
      ),
    ).toBeInTheDocument()
    expect(screen.getByTestId('supply-chest-rare')).toHaveTextContent('Quantidade: 1')
    expect(screen.getByTestId('inventory-item-loot-1')).toBeInTheDocument()
    expect(screen.getByTestId('inventory-count')).toHaveTextContent('1 / 24 itens')
  })

  it('remove o baú da tela quando o último é aberto', async () => {
    inventoryRows = [...forgeRows(), makeChest('chest-rare-1', 'rare', 1)]
    openChestResult = [
      {
        id: 'loot-1',
        user_id: USER_ID,
        item_category: 'helmet',
        rarity: 'rare',
        name: 'Coroa do Foco',
        item_level: 70,
        enhancement_level: 0,
        quantity: 1,
        equipped: false,
      },
    ]
    setupSut(emptyCapture())
    await renderReadyForge()

    fireEvent.click(screen.getByRole('button', { name: 'Abrir baú Raro' }))

    await waitFor(() =>
      expect(screen.queryByTestId('supply-chest-rare')).not.toBeInTheDocument(),
    )
    expect(screen.getByTestId('inventory-item-loot-1')).toBeInTheDocument()
  })

  it('migra o estado antigo do localStorage para o inventário quando o banco está vazio', async () => {
    inventoryRows = []
    const legacy = {
      equipped: {
        weapon: { id: 'equipped:weapon', slot: 'weapon', name: 'Espada do Aprendiz', level: 5 },
      },
      inventory: [{ id: 'spare:helmet:0', slot: 'helmet', name: 'Coifa de Saber', level: 0 }],
    }
    window.localStorage.setItem(EQUIPMENT_STORAGE_KEY, JSON.stringify(legacy))
    insertResultRows = [
      makeGear('inserted-weapon', 'weapon', 'Espada do Aprendiz', 5, true),
      makeGear('inserted-spare', 'helmet', 'Coifa de Saber', 0, false),
    ]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    expect(capture.inventoryInsertCalls).toHaveLength(1)
    const inserted = capture.inventoryInsertCalls[0] as GearInventoryRow[]
    expect(inserted).toHaveLength(2)
    expect(inserted[0]).toMatchObject({
      item_category: 'weapon',
      name: 'Espada do Aprendiz',
      enhancement_level: 5,
      equipped: true,
      rarity: 'common',
      item_level: 10,
    })
    expect(inserted[1]).toMatchObject({ item_category: 'helmet', equipped: false })

    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+5')
    fireEvent.mouseEnter(screen.getByTestId('inventory-item-inserted-spare'))
    expect(
      screen.getByTestId('inventory-item-inserted-spare-tooltip'),
    ).toHaveTextContent('Coifa de Saber')
  })

  it('abre detalhe do item do inventário com ações Equipar e Enviar para Bigorna', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    tapCard(screen.getByTestId('inventory-item-spare-helmet-0'))

    expect(screen.getByRole('heading', { name: 'Coifa de Saber' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Equipar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar para Bigorna/ })).toBeInTheDocument()
  })

  it('abre detalhe de item equipado sem o botão Equipar', async () => {
    inventoryRows = [...forgeRows()]
    setupSut(emptyCapture())
    await renderReadyForge()

    tapCard(screen.getByTestId('equipment-slot-weapon'))

    expect(screen.getByRole('heading', { name: 'Espada do Aprendiz' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Equipar/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Enviar para Bigorna/ })).toBeInTheDocument()
  })

  it('Equipar fecha o modal e equipa o item do inventário via clique', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-weapon-0', 'weapon', 'Lâmina de Estudo')]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    equipFromModal(screen.getByTestId('inventory-item-spare-weapon-0'))

    expect(screen.queryByRole('heading', { name: 'Lâmina de Estudo' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: true }),
    )
    expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: false })
    fireEvent.mouseEnter(screen.getByTestId('equipment-slot-weapon'))
    expect(screen.getByTestId('equipment-slot-weapon-tooltip')).toHaveTextContent(
      'Lâmina de Estudo',
    )
  })

  it('Enviar para Bigorna fecha o modal e seleciona o item na bigorna', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    sendToAnvil(screen.getByTestId('inventory-item-spare-helmet-0'))

    expect(screen.queryByRole('heading', { name: 'Coifa de Saber' })).not.toBeInTheDocument()
    const summary = screen.getByTestId('anvil-selected-item')
    expect(summary).toHaveTextContent('Elmo pronto para refino')
    expect(summary).toHaveTextContent('Coifa de Saber')
  })

  it('usuário novo parte com slots vazios e inventário zerado', async () => {
    inventoryRows = []
    setupSut(emptyCapture())
    await renderReadyForge()

    expect(screen.getByTestId('inventory-count')).toHaveTextContent('0 / 24 itens')
    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('Arma')
    expect(screen.queryByText('Espada do Aprendiz')).not.toBeInTheDocument()
  })
})
