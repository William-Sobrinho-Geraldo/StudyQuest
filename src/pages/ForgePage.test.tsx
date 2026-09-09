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

const USER_ID = 'user-1'

let goldValue: number
let inventoryRows: InventoryRow[]
let insertResultRows: InventoryRow[]
let updateError: { message: string } | null

interface Capture {
  profileUpdatePatches: unknown[]
  inventoryUpdatePatches: unknown[]
  inventoryInsertCalls: unknown[]
}

function makeGear(
  id: string,
  slot: EquipmentSlot,
  name: string,
  level = 0,
  equipped = false,
): GearInventoryRow {
  return {
    id,
    user_id: USER_ID,
    item_category: slot,
    rarity: 'common',
    name,
    level,
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
    level: 0,
    quantity,
    equipped: false,
  }
}

function forgeRows(weaponLevel = 0): InventoryRow[] {
  return [
    makeGear('weapon-eq', 'weapon', 'Espada do Aprendiz', weaponLevel, true),
    makeGear('helmet-eq', 'helmet', 'Elmo do Estudante', 0, true),
    makeGear('chest-eq', 'chest', 'Peitoral do Aprendiz', 0, true),
    makeGear('boots-eq', 'boots', 'Botas do Peregrino', 0, true),
  ]
}

function mockSupabase(capture: Capture) {
  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { gold: goldValue }, error: null }),
          }),
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

function setupSut(capture: Capture) {
  mockSupabase(capture)
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

describe('ForgePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    goldValue = 10_000
    inventoryRows = []
    insertResultRows = []
    updateError = null
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

    for (const slot of SLOTS) {
      expect(screen.getByTestId(`equipment-slot-${slot}`)).toBeInTheDocument()
      expect(screen.getByTestId(`equipment-slot-${slot}`)).toHaveTextContent('+0')
    }
    expect(screen.getByText('Espada do Aprendiz')).toBeInTheDocument()
    expect(screen.getByText('Elmo do Estudante')).toBeInTheDocument()

    expect(screen.getByText('Coifa de Saber')).toBeInTheDocument()
    expect(screen.getByTestId('inventory-count')).toHaveTextContent('1 / 24 itens')
  })

  it('clique em um item prepara a bigorna com chance, custo e botão habilitado', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    fireEvent.click(screen.getByTestId('equipment-slot-weapon'))

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

  it('clique em item do inventário seleciona-o para refino', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    fireEvent.click(screen.getByTestId('inventory-item-spare-helmet-0'))

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

    fireEvent.click(screen.getByTestId('equipment-slot-weapon'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Refinar Espada do Aprendiz de +5 para +6' }),
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Sucesso! Arma +5 → +6')
    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+6')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9840 Gold')

    expect(capture.profileUpdatePatches).toContainEqual({ gold: 9840 })
    expect(capture.inventoryUpdatePatches).toContainEqual({ level: 6 })
    expect(random).toHaveBeenCalledTimes(1)
  })

  it('aplica a regressão de nível na falha quando o rand passa da taxa (+5 para +4)', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    const capture = emptyCapture()
    vi.spyOn(Math, 'random').mockReturnValue(0.9)
    setupSut(capture)
    await renderReadyForge()

    fireEvent.click(screen.getByTestId('equipment-slot-weapon'))
    fireEvent.click(
      screen.getByRole('button', { name: 'Refinar Espada do Aprendiz de +5 para +6' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha! Arma +5 → +4')
    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+4')
    expect(screen.getByTestId('forge-gold')).toHaveTextContent('9840 Gold')
    expect(capture.profileUpdatePatches).toContainEqual({ gold: 9840 })
    expect(capture.inventoryUpdatePatches).toContainEqual({ level: 4 })
  })

  it('não bloqueia +0 para +1 mesmo com rand altíssimo (zona segura 100%)', async () => {
    inventoryRows = [...forgeRows(), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    vi.spyOn(Math, 'random').mockReturnValue(0.999_999)
    setupSut(emptyCapture())
    await renderReadyForge()

    fireEvent.click(screen.getByTestId('equipment-slot-weapon'))
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

    fireEvent.click(screen.getByTestId('equipment-slot-weapon'))

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
    expect(capture.profileUpdatePatches).toHaveLength(0)
    expect(capture.inventoryUpdatePatches).toHaveLength(0)
  })

  it('desabilita o botão no refino máximo (+12)', async () => {
    inventoryRows = [...forgeRows(MAX_REFINE_LEVEL), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    setupSut(emptyCapture())
    await renderReadyForge()

    fireEvent.click(screen.getByTestId('equipment-slot-weapon'))

    const maxButton = screen.getByRole('button', { name: 'Refinar Espada do Aprendiz (máximo)' })
    expect(maxButton).toBeDisabled()
    expect(maxButton).toHaveTextContent(`Máximo (+${MAX_REFINE_LEVEL})`)
  })

  it('falha ao persistir o gold reverte o nível e restaura o saldo', async () => {
    inventoryRows = [...forgeRows(5), makeGear('spare-helmet-0', 'helmet', 'Coifa de Saber')]
    updateError = { message: 'update falhou' }
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    setupSut(emptyCapture())
    await renderReadyForge()

    fireEvent.click(screen.getByTestId('equipment-slot-weapon'))
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

    await waitFor(() =>
      expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('Lâmina de Estudo'),
    )
    expect(screen.getByText('Espada do Aprendiz')).toBeInTheDocument()
    expect(screen.getByTestId('inventory-count')).toHaveTextContent('1 / 24 itens')
    expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: false })
    expect(capture.inventoryUpdatePatches).toContainEqual({ equipped: true })
  })

  it('abre um baú, consome a quantidade e adiciona o equipamento ao inventário', async () => {
    inventoryRows = [...forgeRows(), makeChest('chest-rare-1', 'rare', 2)]
    rpc.mockResolvedValue({
      data: [
        {
          id: 'loot-1',
          user_id: USER_ID,
          item_category: 'weapon',
          rarity: 'rare',
          name: 'Cimitarra do Foco',
          level: 0,
          quantity: 1,
          equipped: false,
        },
      ],
      error: null,
    })
    setupSut(emptyCapture())
    await renderReadyForge()

    const chestCard = screen.getByTestId('supply-chest-rare')
    expect(chestCard).toHaveTextContent('Baú Raro')
    expect(chestCard).toHaveTextContent('Quantidade: 2')

    fireEvent.click(screen.getByRole('button', { name: 'Abrir baú Raro' }))

    expect(rpc).toHaveBeenCalledWith('open_inventory_chest', { p_inventory_id: 'chest-rare-1' })
    expect(
      await screen.findByText('Você abriu um Baú Raro e recebeu Cimitarra do Foco!'),
    ).toBeInTheDocument()
    expect(screen.getByTestId('supply-chest-rare')).toHaveTextContent('Quantidade: 1')
    expect(screen.getByTestId('inventory-item-loot-1')).toBeInTheDocument()
    expect(screen.getByTestId('inventory-count')).toHaveTextContent('1 / 24 itens')
  })

  it('remove o baú da tela quando o último é aberto', async () => {
    inventoryRows = [...forgeRows(), makeChest('chest-rare-1', 'rare', 1)]
    rpc.mockResolvedValue({
      data: [
        {
          id: 'loot-1',
          user_id: USER_ID,
          item_category: 'helmet',
          rarity: 'rare',
          name: 'Coroa do Foco',
          level: 0,
          quantity: 1,
          equipped: false,
        },
      ],
      error: null,
    })
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
      level: 5,
      equipped: true,
      rarity: 'common',
    })
    expect(inserted[1]).toMatchObject({ item_category: 'helmet', equipped: false })

    expect(screen.getByTestId('equipment-slot-weapon')).toHaveTextContent('+5')
    expect(screen.getByText('Coifa de Saber')).toBeInTheDocument()
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