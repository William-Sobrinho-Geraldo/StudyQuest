import { act, render, screen, waitFor } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../auth/AuthContext'
import { ALL_QUOTE_CATEGORIES } from '../lib/quoteCategories'
import { getTodayLocalKey } from '../lib/quoteCache'
import type { MotivationalQuote } from '../services/quoteService'
import { DailyMotivationCard } from './DailyMotivationCard'

const { getSession, onAuthStateChange, from, rpc } = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth: { getSession, onAuthStateChange }, from, rpc },
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

const QUOTE: MotivationalQuote = {
  id: 'quote-1',
  content: 'Conhece-te a ti mesmo.',
  author: 'Sócrates',
  category: 'Filosófica',
}

function mockSession() {
  getSession.mockResolvedValue({ data: { session: SESSION }, error: null })
  onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
    error: null,
  })
}

function mockProfile(preferences: string[] | null = null) {
  const data = preferences === null ? null : { id: 'user-123', quote_preferences: preferences }
  from.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
          })),
        })),
      }
    }
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn() })) })) }
  })
}

function renderCard() {
  return render(
    <AuthProvider>
      <DailyMotivationCard />
    </AuthProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  window.localStorage.clear()
  mockSession()
})

describe('DailyMotivationCard', () => {
  it('exibe a frase cacheada no localStorage sem chamar o Supabase', async () => {
    mockProfile(['Filosófica'])
    window.localStorage.setItem(
      `studyquest:daily_quote:v1:user-123:${getTodayLocalKey()}`,
      JSON.stringify({ quote: QUOTE }),
    )

    renderCard()

    expect(await screen.findByText(`“${QUOTE.content}”`)).toBeInTheDocument()
    expect(screen.getByTestId('daily-motivation-author')).toHaveTextContent(QUOTE.author)
    expect(screen.getByTestId('daily-motivation-author')).toHaveClass('text-right', 'text-xs', 'text-slate-400')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('busca a frase usando todas as categorias quando o perfil não tem preferências', async () => {
    mockProfile(null)
    rpc.mockResolvedValue({ data: [QUOTE], error: null })

    renderCard()

    expect(await screen.findByText(`“${QUOTE.content}”`)).toBeInTheDocument()
    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('get_random_quote_by_category', {
        p_categories: ALL_QUOTE_CATEGORIES,
      })
    })
  })

  it('usa as preferências salvas do usuário para buscar a frase', async () => {
    mockProfile(['Filosófica'])
    rpc.mockResolvedValue({ data: [QUOTE], error: null })

    renderCard()

    expect(await screen.findByText(`“${QUOTE.content}”`)).toBeInTheDocument()
    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('get_random_quote_by_category', {
        p_categories: ['Filosófica'],
      })
    })
  })

  it('assume todas as categorias quando o usuário desmarcou tudo', async () => {
    mockProfile([])
    rpc.mockResolvedValue({ data: [QUOTE], error: null })

    renderCard()

    await waitFor(() => {
      expect(rpc).toHaveBeenCalledWith('get_random_quote_by_category', {
        p_categories: ALL_QUOTE_CATEGORIES,
      })
    })
  })

  it('persiste a frase buscada no localStorage do dia', async () => {
    mockProfile(['Filosófica'])
    rpc.mockResolvedValue({ data: [QUOTE], error: null })

    renderCard()

    await screen.findByText(`“${QUOTE.content}”`)
    const key = `studyquest:daily_quote:v1:user-123:${getTodayLocalKey()}`
    expect(JSON.parse(window.localStorage.getItem(key) ?? '{}')).toEqual({ quote: QUOTE })
  })

  it('mostra skeleton enquanto a frase está sendo carregada', async () => {
    mockProfile(['Filosófica'])
    let resolveFetch!: (value: { data: MotivationalQuote[]; error: null }) => void
    rpc.mockReturnValue(
      new Promise<{ data: MotivationalQuote[]; error: null }>((resolve) => {
        resolveFetch = resolve
      }),
    )

    renderCard()

    expect(screen.getByTestId('daily-motivation-loading')).toBeInTheDocument()

    await act(async () => {
      resolveFetch({ data: [QUOTE], error: null })
    })

    expect(await screen.findByText(`“${QUOTE.content}”`)).toBeInTheDocument()
  })

  it('mantém o card vazio quando a busca falha', async () => {
    mockProfile(['Filosófica'])
    rpc.mockResolvedValue({ data: null, error: { message: 'falha' } })

    renderCard()

    expect(await screen.findByTestId('daily-motivation-empty')).toBeInTheDocument()
  })
})