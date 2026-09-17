import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getSaoPauloDateString } from '../../../utils/merchantBlessing'
import { MerchantBlessingModal } from './MerchantBlessingModal'

const { rpc, showRewardedAd, refreshProfile, profileMock } = vi.hoisted(() => ({
  rpc: vi.fn(),
  showRewardedAd: vi.fn(),
  refreshProfile: vi.fn(),
  profileMock: { daily_ad_views: 0, daily_ad_views_date: null as string | null },
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc },
}))

vi.mock('../../../services/AdService', () => ({
  showRewardedAd,
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
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('exibe a recompensa de 10% e o contador diário', async () => {
    profileMock.daily_ad_views = 3

    renderModal()
    await flush()

    expect(screen.getByTestId('merchant-xp')).toHaveTextContent('100')
    expect(screen.getByTestId('merchant-gold')).toHaveTextContent('30')
    expect(screen.getByTestId('merchant-counter')).toHaveTextContent('Resgates hoje: 3/10')
  })

  it('desabilita o botão e mostra o aviso no limite de 10 resgates', async () => {
    profileMock.daily_ad_views = 10

    renderModal()
    await flush()

    expect(screen.getByRole('button', { name: 'Limite diário atingido' })).toBeDisabled()
    expect(screen.getByText('O Mercador precisa descansar. Volte amanhã!')).toBeInTheDocument()
  })

  it('assiste o anúncio e credita a recompensa com sucesso', async () => {
    const onClaimed = vi.fn()
    showRewardedAd.mockResolvedValue(true)
    rpc.mockResolvedValue({
      data: { xp: 100, gold: 30, daily_ad_views: 1, limit: 10 },
      error: null,
    })

    renderModal(onClaimed)
    await flush()

    fireEvent.click(screen.getByTestId('merchant-watch'))
    await flush()
    await flush()

    expect(showRewardedAd).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('claim_merchant_blessing')
    expect(screen.getByRole('button', { name: 'Coletado!' })).toBeInTheDocument()
    expect(screen.getByTestId('merchant-counter')).toHaveTextContent('Resgates hoje: 1/10')
    expect(onClaimed).toHaveBeenCalledTimes(1)
  })
})
