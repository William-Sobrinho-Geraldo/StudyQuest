import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'
import { ToastProvider } from '../../../components/Toast'
import { InspirationPreferences } from './InspirationPreferences'

const { getSession, onAuthStateChange, from, updateUser } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  updateUser: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange, updateUser }, from, rpc: vi.fn() },
}))

const SESSION = {
  access_token: 'test-token',
  refresh_token: 'test-refresh',
  expires_in: 3600,
  expires_at: 9999999999,
  token_type: 'bearer',
  user: {
    id: 'user-123',
    email: 'hero@studyquest.dev',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00Z',
  },
} satisfies Session

function mockSession() {
  getSession.mockResolvedValue({ data: { session: SESSION }, error: null })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
  updateUser.mockResolvedValue({ data: { user: null }, error: null })
}

let profilePreferences: string[]
let failUpdate: boolean
let mockUpdate: ReturnType<typeof vi.fn>

function mockProfiles() {
  mockUpdate = vi.fn((patch: { quote_preferences?: string[] }) => {
    if (patch.quote_preferences && !failUpdate) {
      profilePreferences = [...patch.quote_preferences]
    }
    return {
      eq: vi.fn().mockResolvedValue(
        failUpdate ? { error: { message: 'falha de rede' } } : { error: null },
      ),
    }
  })

  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: { id: SESSION.user.id, quote_preferences: profilePreferences },
              error: null,
            })),
          })),
        })),
        update: mockUpdate,
      }
    }
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) }
  })
}

function renderPreferences() {
  return render(
    <AuthProvider>
      <ToastProvider>
        <InspirationPreferences />
      </ToastProvider>
    </AuthProvider>,
  )
}

async function openPreferences() {
  renderPreferences()
  const panel = await screen.findByTestId('inspiration-preferences')
  return panel
}

async function waitForCardSync(panel: HTMLElement, expectedSummary: string) {
  // A escolha inicial cai em todas as categorias até o perfil carregar;
  // o teste aguarda o resumo do card sincronizado com as preferências salvas.
  await waitFor(() => {
    expect(within(panel).getByText(/Ativas:/)).toHaveTextContent(expectedSummary)
  })
}

async function openEditor(expectedSummary = 'Ativas: Militares, Religiosas') {
  const panel = await openPreferences()
  await waitForCardSync(panel, expectedSummary)
  const user = userEvent.setup()
  await user.click(within(panel).getByRole('button', { name: /editar/i }))
  const dialog = await screen.findByRole('dialog', { name: /preferências de inspiração/i })
  return { user, panel, dialog }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mockSession()
  mockProfiles()
  failUpdate = false
  profilePreferences = ['Militar', 'Religiosa']
})

describe('InspirationPreferences', () => {
  it('exibe um card resumido com as categorias ativas', async () => {
    const panel = await openPreferences()
    await waitForCardSync(panel, 'Ativas: Militares, Religiosas')

    expect(
      within(panel).getByRole('heading', { name: 'Preferências de Inspiração' }),
    ).toBeInTheDocument()
    expect(within(panel).getByText('Ativas: Militares, Religiosas')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: /editar/i })).toBeInTheDocument()

    // A lista completa fica escondida no modal: nada de chips na tela principal.
    expect(within(panel).queryByTestId('inspiration-chip-Militar')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre o modal exibindo as preferências salvas como chips selecionados', async () => {
    const { dialog } = await openEditor()

    expect(dialog).toBeInTheDocument()

    expect(within(dialog).getByTestId('inspiration-chip-Militar')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(dialog).getByTestId('inspiration-chip-Religiosa')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(dialog).getByTestId('inspiration-chip-Científica')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(dialog).getByTestId('inspiration-chip-Filosófica')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(within(dialog).getByTestId('inspiration-chip-Produtividade')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('altera o rascunho sem chamar a API e persiste apenas ao clicar em Salvar', async () => {
    const user = userEvent.setup()
    const { panel, dialog } = await openEditor()

    await user.click(within(dialog).getByTestId('inspiration-chip-Científica'))

    expect(within(dialog).getByTestId('inspiration-chip-Científica')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    // Apenas o estado local (draft) muda; nenhuma requisição é disparada.
    expect(mockUpdate).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        quote_preferences: ['Militar', 'Religiosa', 'Científica'],
      })
    })
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Preferências de inspiração salvas.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(within(panel).getByText(/Ativas:/)).toHaveTextContent(
        'Ativas: Militares, Científicas, Religiosas',
      )
    })
  })

  it('remove uma categoria do rascunho e persiste apenas ao salvar', async () => {
    const user = userEvent.setup()
    const { panel, dialog } = await openEditor()

    await user.click(within(dialog).getByTestId('inspiration-chip-Militar'))

    expect(within(dialog).getByTestId('inspiration-chip-Militar')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(mockUpdate).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ quote_preferences: ['Religiosa'] })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(within(panel).getByText(/Ativas:/)).toHaveTextContent('Ativas: Religiosas')
    })
  })

  it('bloqueia desmarcar a última categoria ativa', async () => {
    profilePreferences = ['Militar']

    const { dialog } = await openEditor('Ativas: Militares')

    await userEvent.setup().click(within(dialog).getByTestId('inspiration-chip-Militar'))

    expect(
      await screen.findByText('Mantenha ao menos uma categoria de frases selecionada.'),
    ).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(within(dialog).getByTestId('inspiration-chip-Militar')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('dialog', { name: /preferências de inspiração/i })).toBeInTheDocument()
  })

  it('mantém o modal aberto e o rascunho quando o salvamento falha', async () => {
    const user = userEvent.setup()
    const { dialog } = await openEditor()
    failUpdate = true

    await user.click(within(dialog).getByTestId('inspiration-chip-Científica'))
    await user.click(within(dialog).getByRole('button', { name: /salvar/i }))

    expect(await screen.findByText('Não foi possível salvar suas preferências.')).toBeInTheDocument()
    expect(mockUpdate).toHaveBeenCalledWith({
      quote_preferences: ['Militar', 'Religiosa', 'Científica'],
    })
    expect(screen.getByRole('dialog', { name: /preferências de inspiração/i })).toBeInTheDocument()
    expect(within(dialog).getByTestId('inspiration-chip-Científica')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('fecha o modal ao clicar no botão de fechar', async () => {
    const user = userEvent.setup()
    const { dialog } = await openEditor()

    await user.click(within(dialog).getByRole('button', { name: /fechar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})