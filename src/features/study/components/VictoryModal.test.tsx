import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StudyTimerProvider, useStudyTimerContext, type StudyTimerValue } from '../context/StudyTimerContext'
import { VictoryModal } from './VictoryModal'
import { ToastProvider } from '../../../components/Toast'

const createStudySessionMock = vi.hoisted(() =>
  vi.fn(async (durationMinutes: number) => ({
    id: 'sess-1',
    user_id: 'user-1',
    duration_minutes: durationMinutes,
    xp: durationMinutes * 15,
    gold: durationMinutes * 3,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    is_manual: false,
    rewarded: false,
    ad_rewarded: false,
  })),
)

const completeStudySessionMock = vi.hoisted(() =>
  vi.fn(async (_sessionId: string, adWatched: boolean) => ({
    id: 'sess-1',
    durationMinutes: 25,
    xp: adWatched ? 750 : 375,
    gold: adWatched ? 150 : 75,
    rewarded: true,
    adRewarded: adWatched,
  })),
)

vi.mock('../services/studySessionService', () => ({
  createStudySession: createStudySessionMock,
  completeStudySession: completeStudySessionMock,
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

const bgMusic = vi.hoisted(() => ({
  suspendBackgroundMusicForSessionEnd: vi.fn(),
  resumeBackgroundMusicAfterSessionClaim: vi.fn(),
}))

// `useStudyTimer` importa o re-export local; mockar o mesmo módulo garante que
// o fluxo real de pausa/retomada da música não seja executado no teste.
vi.mock('../hooks/useBackgroundMusic', () => ({
  suspendBackgroundMusicForSessionEnd: bgMusic.suspendBackgroundMusicForSessionEnd,
  resumeBackgroundMusicAfterSessionClaim: bgMusic.resumeBackgroundMusicAfterSessionClaim,
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
  createStudySessionMock.mockClear()
  completeStudySessionMock.mockClear()
  rpc.mockClear()
  rpc.mockResolvedValue({ data: null, error: null })
  rewardedAd.isAdReady = true
  rewardedAd.showAd.mockClear()
  rewardedAd.loadAd.mockClear()
  bgMusic.suspendBackgroundMusicForSessionEnd.mockClear()
  bgMusic.resumeBackgroundMusicAfterSessionClaim.mockClear()
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
    expect(screen.getByTestId('victory-xp')).toHaveTextContent('375')
    expect(screen.getByTestId('victory-gold')).toHaveTextContent('75')
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

    expect(completeStudySessionMock).toHaveBeenCalledTimes(1)
    expect(completeStudySessionMock).toHaveBeenCalledWith('sess-1', false)
    expect(screen.queryByRole('dialog', { name: /sessão concluída/i })).not.toBeInTheDocument()
    expect(timerRef.current?.status).toBe('idle')
  })

  it('pausa a música ao concluir e só retoma após coletar as recompensas', async () => {
    const { getByRole } = renderModal()
    await finishSession()

    expect(bgMusic.suspendBackgroundMusicForSessionEnd).toHaveBeenCalledTimes(1)
    // Enquanto o modal de recompensas está aberto, a música nunca é retomada.
    expect(bgMusic.resumeBackgroundMusicAfterSessionClaim).not.toHaveBeenCalled()

    await act(async () => {
      getByRole('button', { name: /coletar e sair/i }).click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(bgMusic.resumeBackgroundMusicAfterSessionClaim).toHaveBeenCalledTimes(1)
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
    expect(completeStudySessionMock).toHaveBeenCalledTimes(1)
    expect(completeStudySessionMock).toHaveBeenCalledWith('sess-1', true)
    expect(screen.queryByRole('dialog', { name: /sessão concluída/i })).not.toBeInTheDocument()
    expect(timerRef.current?.status).toBe('idle')
  })

  it('exibe a mensagem com os valores dobrados após assistir ao anúncio', async () => {
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

    expect(completeStudySessionMock).toHaveBeenCalledWith('sess-1', true)
    expect(
      screen.getByText('Recompensas coletadas: +750 XP e +150 Gold'),
    ).toBeInTheDocument()
  })

  it('exibe "Carregando anúncio..." e desabilita o botão quando o anúncio não está pronto', async () => {
    rewardedAd.isAdReady = false
    renderModal()
    await finishSession()

    const button = screen.getByRole('button', { name: /carregando anúncio/i })
    expect(button).toBeDisabled()
    expect(screen.queryByRole('button', { name: /assistir vídeo/i })).not.toBeInTheDocument()
  })

  it('erro no complete_study_session exibe toast e mantém o modal aberto', async () => {
    completeStudySessionMock.mockImplementationOnce(() => Promise.reject(new Error('rate limit')))
    const { getByRole } = renderModal()
    await finishSession()

    await act(async () => {
      getByRole('button', { name: /coletar e sair/i }).click()
      await vi.runAllTimersAsync()
    })

    expect(completeStudySessionMock).toHaveBeenCalledTimes(1)
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