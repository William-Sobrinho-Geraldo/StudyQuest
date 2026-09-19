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

async function waitForProfileSync(panel: HTMLElement) {
  // A escolha inicial cai em todas as categorias até o perfil carregar;
  // o teste aguarda o estado sincronizado com as preferências salvas.
  await waitFor(() => {
    expect(
      within(panel).getByRole('checkbox', { name: 'Científicas' }),
    ).not.toBeChecked()
  })
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
  it('exibe as preferências salvas marcadas e as demais desmarcadas', async () => {
    const panel = await openPreferences()
    await waitForProfileSync(panel)

    expect(within(panel).getByRole('checkbox', { name: 'Militares' })).toBeChecked()
    expect(within(panel).getByRole('checkbox', { name: 'Religiosas' })).toBeChecked()
    expect(within(panel).getByRole('checkbox', { name: 'Científicas' })).not.toBeChecked()
    expect(within(panel).getByRole('checkbox', { name: 'Filosóficas' })).not.toBeChecked()
    expect(within(panel).getByRole('checkbox', { name: 'Produtividade' })).not.toBeChecked()
  })

  it('adiciona uma categoria ao marcar e salva no perfil', async () => {
    const user = userEvent.setup()
    const panel = await openPreferences()
    await waitForProfileSync(panel)

    await user.click(within(panel).getByRole('checkbox', { name: 'Científicas' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        quote_preferences: ['Militar', 'Religiosa', 'Científica'],
      })
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Categoria ativada nas frases.')
  })

  it('remove uma categoria ao desmarcar e salva no perfil', async () => {
    const user = userEvent.setup()
    const panel = await openPreferences()
    await waitForProfileSync(panel)

    await user.click(within(panel).getByRole('checkbox', { name: 'Militares' }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ quote_preferences: ['Religiosa'] })
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Categoria ocultada das frases.')
  })

  it('bloqueia desmarcar a última categoria ativa', async () => {
    const user = userEvent.setup()
    profilePreferences = ['Militar']

    const panel = await openPreferences()

    await waitFor(() => {
      expect(within(panel).getByRole('checkbox', { name: 'Filosóficas' })).not.toBeChecked()
    })
    await user.click(within(panel).getByRole('checkbox', { name: 'Militares' }))

    expect(
      await screen.findByText('Mantenha ao menos uma categoria de frases selecionada.'),
    ).toBeInTheDocument()
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(within(panel).getByRole('checkbox', { name: 'Militares' })).toBeChecked()
  })

  it('reverte a seleção quando o salvamento falha', async () => {
    const user = userEvent.setup()
    failUpdate = true
    const panel = await openPreferences()
    await waitForProfileSync(panel)

    await user.click(within(panel).getByRole('checkbox', { name: 'Científicas' }))

    expect(await screen.findByText('Não foi possível salvar suas preferências.')).toBeInTheDocument()
    expect(within(panel).getByRole('checkbox', { name: 'Científicas' })).not.toBeChecked()
    expect(within(panel).getByRole('checkbox', { name: 'Militares' })).toBeChecked()
  })
})