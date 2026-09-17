import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StudyTimerProvider, useStudyTimerContext, type StudyTimerValue } from '../context/StudyTimerContext'
import { VictoryModal } from './VictoryModal'
import { ToastProvider } from '../../../components/Toast'

const saveStudySessionMock = vi.hoisted(() => vi.fn().mockResolvedValue({}))

vi.mock('../services/studySessionService', () => ({
  saveStudySession: saveStudySessionMock,
}))

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1', email: 'a@b.com' } },
        error: null,
      }),
    },
    rpc,
    from: vi.fn(),
  },
}))

const rewardedAd = vi.hoisted(() => ({
  isAdReady: true,
  showAd: vi.fn(),
  loadAd: vi.fn(),
}))

vi.mock('../../../hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    isAdReady: rewardedAd.isAdReady,
    isLoading: false,
    showAd: rewardedAd.showAd,
    loadAd: rewardedAd.loadAd,
  }),
}))

const capacitorMocks = vi.hoisted(() => ({
  isNative: true,
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => capacitorMocks.isNative,
    getPlatform: () => (capacitorMocks.isNative ? 'android' : 'web'),
  },
}))

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
  },
}))

let timerRef: { current: StudyTimerValue | null } = { current: null }

function Harness() {
  const timer = useStudyTimerContext()
  timerRef.current = timer
  return (
    <>
      <span data-testid="timer-status">{timer.status}</span>
      <VictoryModal />
    </>
  )
}

function renderModal() {
  return render(
    <ToastProvider>
      <StudyTimerProvider>
        <Harness />
      </StudyTimerProvider>
    </ToastProvider>,
  )
}

async function finishSession() {
  act(() => {
    timerRef.current?.selectDuration(25)
    void timerRef.current?.finish()
  })
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  saveStudySessionMock.mockClear()
  rpc.mockClear()
  rpc.mockResolvedValue({ data: null, error: null })
  rewardedAd.isAdReady = true
  rewardedAd.showAd.mockClear()
  rewardedAd.loadAd.mockClear()
  capacitorMocks.isNative = true
  timerRef.current = null
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('VictoryModal', () => {
  it('exibe recompensas ao completar sessão', async () => {
    renderModal()
    await finishSession()

    expect(screen.getByRole('dialog', { name: /sessão concluída/i })).toBeInTheDocument()
    expect(screen.getByText('Sessão Concluída!')).toBeInTheDocument()
    expect(screen.getByText('25 minutos focados. Você farmou muito bem!')).toBeInTheDocument()
    expect(screen.getByTestId('victory-xp')).toHaveTextContent('250')
    expect(screen.getByTestId('victory-gold')).toHaveTextContent('50')
  })

  it('não exibe o modal quando a sessão está em andamento', async () => {
    renderModal()
    act(() => {
      timerRef.current?.selectDuration(25)
      timerRef.current?.start()
    })

    expect(screen.queryByRole('dialog', { name: /sessão concluída/i })).not.toBeInTheDocument()
  })

  it('Coletar e Sair salva a recompensa base no Supabase e fecha o modal', async () => {
    const { getByRole } = renderModal()
    await finishSession()

    await act(async () => {
      getByRole('button', { name: /coletar e sair/i }).click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('add_xp', { p_xp: 250, p_gold: 50 })
    expect(screen.queryByRole('dialog', { name: /sessão concluída/i })).not.toBeInTheDocument()
    expect(timerRef.current?.status).toBe('idle')
  })

  it('Assistir Vídeo chama o showAd e dobra as recompensas', async () => {
    rewardedAd.showAd.mockImplementationOnce((onSuccess: () => void) => {
      onSuccess()
    })
    const { getByRole } = renderModal()
    await finishSession()

    await act(async () => {
      getByRole('button', { name: /assistir vídeo/i }).click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(rewardedAd.showAd).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('add_xp', { p_xp: 500, p_gold: 100 })
    expect(screen.queryByRole('dialog', { name: /sessão concluída/i })).not.toBeInTheDocument()
    expect(timerRef.current?.status).toBe('idle')
  })

  it('exibe "Carregando anúncio..." e desabilita o botão quando o anúncio não está pronto', async () => {
    rewardedAd.isAdReady = false
    renderModal()
    await finishSession()

    const button = screen.getByRole('button', { name: /carregando anúncio/i })
    expect(button).toBeDisabled()
    expect(screen.queryByRole('button', { name: /assistir vídeo/i })).not.toBeInTheDocument()
  })

  it('erro no add_xp exibe toast e mantém o modal aberto', async () => {
    rpc.mockReturnValue(Promise.resolve({ data: null, error: { message: 'rate limit' } }))
    const { getByRole } = renderModal()
    await finishSession()

    await act(async () => {
      getByRole('button', { name: /coletar e sair/i }).click()
      await vi.runAllTimersAsync()
    })

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: /sessão concluída/i })).toBeInTheDocument()
    expect(screen.getByTestId('timer-status')).toHaveTextContent('completed')
  })

  it('na Web não exibe botão de anúncio e mostra o aviso de plataforma', async () => {
    capacitorMocks.isNative = false
    renderModal()
    await finishSession()

    expect(screen.queryByRole('button', { name: /assistir vídeo/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(
        /O recurso de anúncios para acelerar o tempo está disponível apenas no aplicativo Android \(iOS em breve\)\./i,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /coletar e sair/i })).toBeInTheDocument()
    expect(rewardedAd.showAd).not.toHaveBeenCalled()
  })
})