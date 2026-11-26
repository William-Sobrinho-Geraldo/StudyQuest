import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSaoPauloDateString } from '../../../utils/merchantBlessing'
import { MerchantBlessingModal } from './MerchantBlessingModal'

const { rpc, refreshProfile, profileMock } = vi.hoisted(() => ({
  rpc: vi.fn(),
  refreshProfile: vi.fn(),
  profileMock: { daily_ad_views: 0, daily_ad_views_date: null as string | null },
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc },
}))

const rewardedAd = vi.hoisted(() => ({
  isAdReady: true,
  isLoading: false,
  showAd: vi.fn(),
  loadAd: vi.fn(),
}))

vi.mock('../../../hooks/useRewardedAd', () => ({
  useRewardedAd: () => ({
    isAdReady: rewardedAd.isAdReady,
    isLoading: rewardedAd.isLoading,
    showAd: rewardedAd.showAd,
    loadAd: rewardedAd.loadAd,
  }),
}))

vi.mock('../../../utils/platform', () => ({
  isAndroid: () => true,
}))

vi.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ profile: profileMock, refreshProfile }),
}))

const NOW = new Date('2026-09-09T12:00:00.000Z')

function renderModal(onClaimed?: () => void) {
  return render(<MerchantBlessingModal onClose={() => undefined} onClaimed={onClaimed} />)
}

async function flush(): Promise<void> {
  await act(async () => undefined)
}

describe('MerchantBlessingModal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    vi.clearAllMocks()
    profileMock.daily_ad_views = 0
    profileMock.daily_ad_views_date = getSaoPauloDateString(NOW)
    rewardedAd.isAdReady = true
    rewardedAd.isLoading = false
    rewardedAd.showAd.mockReset()
    rewardedAd.loadAd.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exibe a recompensa e o contador diário', async () => {
    profileMock.daily_ad_views = 0

    renderModal()
    await flush()

    expect(screen.getByTestId('merchant-xp')).toHaveTextContent('15')
    expect(screen.getByTestId('merchant-gold')).toHaveTextContent('3')
    expect(screen.getByTestId('merchant-counter')).toHaveTextContent('Resgates hoje: 0/10')
  })

  it('mostra quantos resgates restam quando abaixo do limite', async () => {
    profileMock.daily_ad_views = 7

    renderModal()
    await flush()

    expect(screen.getByTestId('merchant-counter')).toHaveTextContent('Resgates hoje: 7/10')
    expect(screen.getByText('Restam 3 resgates hoje.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assistir Visão Mágica' })).toBeEnabled()
  })

  it('desabilita e informa quando atinge o limite de 10 resgates', async () => {
    profileMock.daily_ad_views = 10

    renderModal()
    await flush()

    expect(screen.getByTestId('merchant-counter')).toHaveTextContent('Resgates hoje: 10/10')
    expect(screen.getByRole('button', { name: 'Limite diário atingido' })).toBeDisabled()
    expect(screen.getByText('Limite diário atingido. Volte amanhã!')).toBeInTheDocument()
  })

  it('reinicia a contagem no dia seguinte', async () => {
    profileMock.daily_ad_views = 10
    profileMock.daily_ad_views_date = '2026-09-08'

    renderModal()
    await flush()

    expect(screen.getByTestId('merchant-counter')).toHaveTextContent('Resgates hoje: 0/10')
    expect(screen.getByRole('button', { name: 'Assistir Visão Mágica' })).toBeEnabled()
  })

  it('credita a recompensa apenas quando o anúncio é concluído', async () => {
    const onClaimed = vi.fn()
    rewardedAd.showAd.mockImplementationOnce((onSuccess: () => void) => {
      onSuccess()
    })
    rpc.mockResolvedValue({
      data: { xp: 15, gold: 3, daily_ad_views: 1 },
      error: null,
    })

    renderModal(onClaimed)
    await flush()

    fireEvent.click(screen.getByTestId('merchant-watch'))
    await flush()
    await flush()

    expect(rewardedAd.showAd).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('claim_merchant_blessing')
    expect(screen.getByRole('button', { name: 'Coletado!' })).toBeInTheDocument()
    expect(screen.getByTestId('merchant-counter')).toHaveTextContent('Resgates hoje: 1/10')
    expect(onClaimed).toHaveBeenCalledTimes(1)
  })

  it('credita XP e Gold mesmo quando a RPC retorna o resultado como string JSON', async () => {
    const onClaimed = vi.fn()
    rewardedAd.showAd.mockImplementationOnce((onSuccess: () => void) => {
      onSuccess()
    })
    rpc.mockResolvedValue({
      data: '{"xp":15,"gold":3,"daily_ad_views":1}',
      error: null,
    })

    renderModal(onClaimed)
    await flush()

    fireEvent.click(screen.getByTestId('merchant-watch'))
    await flush()
    await flush()

    expect(rpc).toHaveBeenCalledWith('claim_merchant_blessing')
    expect(screen.getByTestId('floating-reward')).toHaveTextContent('15 XP')
    expect(screen.getByTestId('floating-reward')).toHaveTextContent('3 Gold')
    expect(screen.getByRole('button', { name: 'Coletado!' })).toBeInTheDocument()
    expect(screen.getByTestId('merchant-counter')).toHaveTextContent('Resgates hoje: 1/10')
    expect(onClaimed).toHaveBeenCalledTimes(1)
  })

  it('NÃO credita a recompensa quando o anúncio não é concluído (fechado sem recompensa)', async () => {
    // showAd não invoca nenhum callback: representa o usuário fechando o anúncio
    // antes de concluir a visualização recompensada.
    renderModal()
    await flush()

    fireEvent.click(screen.getByTestId('merchant-watch'))
    await flush()
    await flush()

    expect(rewardedAd.showAd).toHaveBeenCalledTimes(1)
    expect(rpc).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Coletado!' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assistir Visão Mágica' })).toBeEnabled()
  })

  it('NÃO credita a recompensa e informa indisponibilidade quando o anúncio falha ao abrir', async () => {
    rewardedAd.showAd.mockImplementationOnce(
      (_onSuccess: () => void, onError?: () => void) => {
        onError?.()
      },
    )

    renderModal()
    await flush()

    fireEvent.click(screen.getByTestId('merchant-watch'))
    await flush()

    expect(rewardedAd.showAd).toHaveBeenCalledTimes(1)
    expect(rpc).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Anúncio indisponível no momento. Tente novamente.',
    )
    expect(screen.queryByRole('button', { name: 'Coletado!' })).not.toBeInTheDocument()
  })

  it('desabilita o botão e mostra carregando enquanto o anúncio carrega', async () => {
    rewardedAd.isAdReady = false
    rewardedAd.isLoading = true

    renderModal()
    await flush()

    const button = screen.getByRole('button', { name: 'Carregando anúncio...' })
    expect(button).toBeDisabled()
  })

  it('desabilita o botão e informa indisponível quando o anúncio não carregou', async () => {
    rewardedAd.isAdReady = false
    rewardedAd.isLoading = false

    renderModal()
    await flush()

    const button = screen.getByRole('button', { name: 'Anúncio indisponível' })
    expect(button).toBeDisabled()
  })
})
