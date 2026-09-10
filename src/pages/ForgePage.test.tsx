import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { AuthProvider } from '../features/auth/AuthContext'
import { EQUIPMENT_STORAGE_KEY, type GearInventoryRow, type InventoryRow } from '../features/forge/lib/forgeItems'
import { MAX_REFINE_LEVEL, SLOTS, type EquipmentSlot } from '../features/forge/lib/forgeRules'
import { ITEM_DRAG_SLOT_TYPE } from '../features/forge/lib/dragAndDrop'
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

const USER_ID = 'user-1'

let goldValue: number
let characterLevelValue: number
let inventoryRows: InventoryRow[]
let insertResultRows: InventoryRow[]
let updateError: { message: string } | null
let rpcError: { message: string } | null
let openChestResult: InventoryRow[]

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
    if (fn === 'refine_item') {
      const id = args.p_inventory_id as string
      const success = args.p_success as boolean
      const current = args.p_enhancement_level as number
      const next = success
        ? Math.min(current + 1, MAX_REFINE_LEVEL)
        : Math.max(current - 1, 0)
      const row = inventoryRows.find((r) => r.id === id)
      if (!row || row.item_category === 'supply_chest') {
        return Promise.resolve({ data: [], error: null })
      }
      return Promise.resolve({
        data: [{ ...row, enhancement_level: next }],
        error: null,
      })
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

function makeDataTransfer(): DataTransfer {
  try {
    if (typeof DataTransfer !== 'undefined') {
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/plain', 'probe')
      dataTransfer.getData('text/plain')
      dataTransfer.clearData()
      return dataTransfer
    }
  } catch {
    // jsdom sem suporte completo de DataTransfer: usa um stub equivalente.
  }

  const store = new Map<string, string>()
  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [],
    items: [],
    types: [],
    setData: (type: string, value: string) => store.set(type, value),
    getData: (type: string) => store.get(type) ?? '',
    clearData: () => store.clear(),
    setDragImage: () => {},
  } as unknown as DataTransfer
}

function dragAndDrop(source: HTMLElement, target: HTMLElement) {
  const dataTransfer = makeDataTransfer()
  fireEvent.dragStart(source, { dataTransfer })
  fireEvent.drop(target, { dataTransfer })
  fireEvent.dragEnd(source)
}

// O ItemCard abre o modal por pointerdown/up (com limiar de 300ms para não
// conflitar com o drag). fireEvent.click não dispara esses eventos.
function tapCard(card: HTMLElement) {
  fireEvent.pointerDown(card)
  fireEvent.pointerUp(card)
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

  it('arrastar item para a bigorna prepara-a com chance, custo e botão habilitado', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('equipment-slot-weapon'),
      screen.getByTestId('anvil-drop-zone'),
    )

    const summary = screen.getByTestId('anvil-selected-item')
    expect(summary).toHaveTextContent('Arma pronto para refino')
    expect(summary).toHaveTextContent('Espada do Aprendiz')
    expect(summary).toHaveTextContent('80%')
    expect(summary).toHaveTextContent('160 Gold')

    const refineButton = screen.getByRole('button', {
      name: 'Refinar Espada do Aprendiz de +5 para +6',
    })
    expect(refineButton).toBeEnabled()
    expect(refineButton).toHaveTextContent('Refinar +5 → +6')
  })

  it('arrastar item do inventário para a bigorna seleciona-o para refino', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('inventory-item-spare-helmet-0'),
      screen.getByTestId('anvil-drop-zone'),
    )

    const summary = screen.getByTestId('anvil-selected-item')
    expect(summary).toHaveTextContent('Elmo pronto para refino')
    expect(summary).toHaveTextContent('Coifa de Saber')
    expect(
      screen.getByRole('button', { name: 'Refinar Coifa de Saber de +0 para +1' }),
    ).toBeEnabled()
  })

  it('refina com sucesso quando o rand fica abaixo da taxa (+5 para +6)', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    const capture = emptyCapture()
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5)
    setupSut(capture)
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('equipment-slot-weapon'),
      screen.getByTestId('anvil-drop-zone'),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Refinar Espada do Aprendiz de +5 para +6' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Sucesso! Arma +5 → +6')
    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+6')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9840 Gold')

    expect(rpc).toHaveBeenCalledWith('refine_item', {
      p_inventory_id: 'weapon-eq',
      p_success: true,
      p_enhancement_level: 5,
    })
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('aplica a regressão de nível na falha quando o rand passa da taxa (+5 para +4)', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    const capture = emptyCapture()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    setupSut(capture)
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('equipment-slot-weapon'),
      screen.getByTestId('anvil-drop-zone'),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Refinar Espada do Aprendiz de +5 para +6' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha! Arma +5 → +4')
    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+4')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9840 Gold')
    expect(rpc).toHaveBeenCalledWith('refine_item', {
      p_inventory_id: 'weapon-eq',
      p_success: false,
      p_enhancement_level: 5,
    })
  })

  it('não bloqueia +0 para +1 mesmo com rand altíssimo (zona segura 100%)', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999)
    setupSut(emptyCapture())
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('equipment-slot-weapon'),
      screen.getByTestId('anvil-drop-zone'),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Refinar Espada do Aprendiz de +0 para +1' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Sucesso! Arma +0 → +1')
    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+1')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9975 Gold')
  })

  it('bloqueia a tentativa quando o saldo não cobre o custo e mantém o nível', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    goldValue = 100
    const capture = emptyCapture()
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    setupSut(capture)
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('equipment-slot-weapon'),
      screen.getByTestId('anvil-drop-zone'),
    )

    const refineButton = screen.getByRole('button', {
      name: 'Refinar Espada do Aprendiz de +5 para +6',
    })
    expect(refineButton).toBeDisabled()
    expect(screen.getByText('Gold insuficiente para esta tentativa.')).toBeInTheDocument()

    fireEvent.click(refineButton)

    await waitFor(() => {
      expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+5')
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalledWith('refine_item', expect.anything())
  })

  it('desabilita o botão no refino máximo (+12)', async () => {
    inventoryRows = [...forgeRows(MAX_REFINE_LEVEL), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('equipment-slot-weapon'),
      screen.getByTestId('anvil-drop-zone'),
    )

    const maxButton = screen.getByRole('button', { name: 'Refinar Espada do Aprendiz (máximo)' })
    expect(maxButton).toBeDisabled()
    expect(maxButton).toHaveTextContent(`Máximo (+${MAX_REFINE_LEVEL})`)
  })

  it('falha ao persistir o refino na RPC reverte o nível e restaura o saldo', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    rpcError = { message: 'update falhou' }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    setupSut(emptyCapture())
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('equipment-slot-weapon'),
      screen.getByTestId('anvil-drop-zone'),
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Refinar Espada do Aprendiz de +5 para +6' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('update falhou')
    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+5')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('10000 Gold')
  })

  it('arrastar um item equipado até a bigorna seleciona-o para refino', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('equipment-slot-weapon'),
      screen.getByTestId('anvil-drop-zone'),
    )

    const summary = screen.getByTestId('anvil-selected-item')
    expect(summary).toHaveTextContent('Espada do Aprendiz')
    expect(summary).toHaveTextContent('80%')
    expect(
      screen.getByRole('button', { name: 'Refinar Espada do Aprendiz de +5 para +6' }),
    ).toBeEnabled()
  })

  it('arrastar um item do inventário até a bigorna seleciona-o para refino', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('inventory-item-spare-helmet-0'),
      screen.getByTestId('anvil-drop-zone'),
    )

    const summary = screen.getByTestId('anvil-selected-item')
    expect(summary).toHaveTextContent('Coifa de Saber')
    expect(
      screen.getByRole('button', { name: 'Refinar Coifa de Saber de +0 para +1' }),
    ).toBeEnabled()
  })

  it('arrastar item do inventário sobre um slot equipa e devolve o antigo ao inventário', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-weapon-0', 'weapon', 'Lâmina de Estudo')]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('inventory-item-spare-weapon-0'),
      screen.getByTestId('equipment-slot-weapon'),
    )

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

  it('rejeita soltar item em slot de tipo diferente sem chamar o banco', async () => {
    inventoryRows = [
      ...forgeRows(),
      makeGear('spare-chest-0', 'chest', 'Peitoral de Ferro', 0, false),
    ]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('inventory-item-spare-chest-0'),
      screen.getByTestId('equipment-slot-boots'),
    )

    expect(screen.getByTestId('inventory-item-spare-chest-0')).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('equipment-slot-boots'))
    expect(screen.getByTestId('equipment-slot-boots-tooltip')).toHaveTextContent(
      'Botas do Peregrino',
    )
    expect(capture.inventoryUpdatePatches).toHaveLength(0)
  })

  it('aceita soltar item no slot do tipo correspondente (mesma categoria)', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Elmo de Ferro', 0, false)]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('inventory-item-spare-helmet-0'),
      screen.getByTestId('equipment-slot-helmet'),
    )

    await waitFor(() =>
      expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: true }),
    )
    expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: false })
    expect(screen.queryByTestId('inventory-item-spare-helmet-0')).not.toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByTestId('equipment-slot-helmet'))
    expect(screen.getByTestId('equipment-slot-helmet-tooltip')).toHaveTextContent('Elmo de Ferro')
  })

  it('troca a bota equipada ao soltar uma nova bota no slot (desequipa antes de equipar)', async () => {
    inventoryRows = [
      ...forgeRows(),
      makeGear('spare-boots-0', 'boots', 'Botas do Andarilho', 0, false),
    ]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    dragAndDrop(
      screen.getByTestId('inventory-item-spare-boots-0'),
      screen.getByTestId('equipment-slot-boots'),
    )

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

  it('ignora drop forçado em slot sem drag real do item (defesa contra payload simulado)', async () => {
    characterLevelValue = 23
    inventoryRows = [
      ...forgeRows(),
      makeGear('spare-high-0', 'weapon', 'Lâmina de Estudo', 0, false, 30),
    ]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    const dataTransfer = makeDataTransfer()
    dataTransfer.setData('text/plain', 'spare-high-0')
    dataTransfer.setData(ITEM_DRAG_SLOT_TYPE, 'weapon')
    fireEvent.drop(screen.getByTestId('equipment-slot-weapon'), { dataTransfer })

    expect(capture.inventoryUpdatePatches).toHaveLength(0)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('inventory-item-spare-high-0')).toBeInTheDocument()
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

  it('some o tooltip ao iniciar o arrasto e não o deixa preso após o drop', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-weapon-0', 'weapon', 'Lâmina de Estudo')]
    setupSut(emptyCapture())
    await renderReadyForge()

    const card = screen.getByTestId('inventory-item-spare-weapon-0')
    fireEvent.mouseEnter(card)
    expect(screen.getByTestId('inventory-item-spare-weapon-0-tooltip')).toBeInTheDocument()

    fireEvent.dragStart(card, { dataTransfer: makeDataTransfer() })
    expect(screen.queryByTestId('inventory-item-spare-weapon-0-tooltip')).not.toBeInTheDocument()

    fireEvent.dragEnd(card)
    expect(screen.queryByTestId('inventory-item-spare-weapon-0-tooltip')).not.toBeInTheDocument()
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
    expect(
      screen.getByRole('button', { name: /Equipar/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Enviar para Bigorna/ }),
    ).toBeInTheDocument()
  })

  it('abre detalhe de item equipado sem o botão Equipar', async () => {
    inventoryRows = [...forgeRows()]
    setupSut(emptyCapture())
    await renderReadyForge()

    tapCard(screen.getByTestId('equipment-slot-weapon'))

    expect(screen.getByRole('heading', { name: 'Espada do Aprendiz' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Equipar/ })).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Enviar para Bigorna/ }),
    ).toBeInTheDocument()
  })

  it('Equipar fecha o modal e equipa o item do inventário via clique (sem drag)', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-weapon-0', 'weapon', 'Lâmina de Estudo')]
    const capture = emptyCapture()
    setupSut(capture)
    await renderReadyForge()

    tapCard(screen.getByTestId('inventory-item-spare-weapon-0'))
    fireEvent.click(screen.getByRole('button', { name: /Equipar/ }))

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

    tapCard(screen.getByTestId('inventory-item-spare-helmet-0'))
    fireEvent.click(screen.getByRole('button', { name: /Enviar para Bigorna/ }))

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