import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/Toast'
import { onFriendsChanged } from '../lib/socialEvents'
import { InviteAcceptModal } from './InviteAcceptModal'

const PENDING_INVITE_KEY = 'studyquest_pending_invite'

const mocks = vi.hoisted(() => ({
  acceptLinkInvite: vi.fn(),
}))

vi.mock('../services/socialService', () => ({
  acceptLinkInvite: mocks.acceptLinkInvite,
}))

function renderModal(onClose: ReturnType<typeof vi.fn>) {
  return render(
    <ToastProvider>
      <InviteAcceptModal playerTag="ana#1234" onClose={onClose} />
    </ToastProvider>,
  )
}

const friendsChanged = vi.fn()
const unsubscribeFriendsChanged = onFriendsChanged(friendsChanged)

beforeEach(() => {
  localStorage.setItem(
    PENDING_INVITE_KEY,
    JSON.stringify({ tag: 'ana#1234', timestamp: 1_234 }),
  )
  mocks.acceptLinkInvite.mockReset()
  friendsChanged.mockClear()
})

afterEach(() => {
  vi.clearAllMocks()
})

afterAll(() => {
  unsubscribeFriendsChanged()
})

describe('InviteAcceptModal — aceitação de convite por link', () => {
  it('aceita o convite: fecha o modal, limpa o storage e avisa o refetch de amigos', async () => {
    mocks.acceptLinkInvite.mockResolvedValue({ success: true, friendship_id: 'f-1' })
    const onClose = vi.fn()

    renderModal(onClose)

    await userEvent.click(screen.getByRole('button', { name: /aceitar convite/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(mocks.acceptLinkInvite).toHaveBeenCalledWith('ana#1234')
    expect(localStorage.getItem(PENDING_INVITE_KEY)).toBeNull()
    expect(friendsChanged).toHaveBeenCalledOnce()
    expect(await screen.findByText('Vocês agora são amigos!')).toBeInTheDocument()
  })

  it('desabilita os botões enquanto o aceite está em andamento', async () => {
    let resolveAccept: (value: { success: boolean }) => void = () => {}
    mocks.acceptLinkInvite.mockReturnValue(
      new Promise((resolve) => {
        resolveAccept = resolve
      }),
    )
    const onClose = vi.fn()

    renderModal(onClose)
    await userEvent.click(screen.getByRole('button', { name: /aceitar convite/i }))

    expect(screen.getByRole('button', { name: /aceitando/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /recusar/i })).toBeDisabled()

    resolveAccept({ success: true })
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('mantém o modal aberto e exibe erro quando o jogador não é encontrado', async () => {
    mocks.acceptLinkInvite.mockResolvedValue({ success: false, error: 'player_not_found' })
    const onClose = vi.fn()

    renderModal(onClose)
    await userEvent.click(screen.getByRole('button', { name: /aceitar convite/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Jogador não encontrado.')
    expect(onClose).not.toHaveBeenCalled()
    expect(localStorage.getItem(PENDING_INVITE_KEY)).not.toBeNull()
  })
})