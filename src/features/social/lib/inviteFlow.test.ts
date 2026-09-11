import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { completeSignupWithInvite } from './inviteFlow'

const PENDING_INVITE_KEY = 'studyquest_pending_invite'

const mocks = vi.hoisted(() => ({
  acceptLinkInvite: vi.fn(),
  emitFriendsChanged: vi.fn(),
}))

vi.mock('../services/socialService', () => ({
  acceptLinkInvite: mocks.acceptLinkInvite,
}))

vi.mock('./socialEvents', () => ({
  emitFriendsChanged: mocks.emitFriendsChanged,
}))

beforeEach(() => {
  localStorage.clear()
  mocks.acceptLinkInvite.mockReset()
  mocks.emitFriendsChanged.mockReset()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('completeSignupWithInvite — auto-aceite no cadastro', () => {
  it('não faz nada quando não há convite pendente', async () => {
    const outcome = await completeSignupWithInvite()

    expect(outcome).toEqual({ hadInvite: false, accepted: false, playerTag: null })
    expect(mocks.acceptLinkInvite).not.toHaveBeenCalled()
    expect(mocks.emitFriendsChanged).not.toHaveBeenCalled()
  })

  it('aceita o convite, limpa o localStorage e avisa quem escuta', async () => {
    localStorage.setItem(
      PENDING_INVITE_KEY,
      JSON.stringify({ tag: 'ana#1234', timestamp: 1_234 }),
    )
    mocks.acceptLinkInvite.mockResolvedValue({ success: true, friendship_id: 'f-1' })

    const outcome = await completeSignupWithInvite()

    expect(outcome).toEqual({ hadInvite: true, accepted: true, playerTag: 'ana#1234' })
    expect(mocks.acceptLinkInvite).toHaveBeenCalledWith('ana#1234')
    expect(localStorage.getItem(PENDING_INVITE_KEY)).toBeNull()
    expect(mocks.emitFriendsChanged).toHaveBeenCalledOnce()
  })

  it('não emite evento de amigos quando a RPC retorna erro', async () => {
    localStorage.setItem(
      PENDING_INVITE_KEY,
      JSON.stringify({ tag: 'ana#1234', timestamp: 1_234 }),
    )
    mocks.acceptLinkInvite.mockResolvedValue({ success: false, error: 'player_not_found' })

    const outcome = await completeSignupWithInvite()

    expect(outcome).toEqual({ hadInvite: true, accepted: false, playerTag: 'ana#1234' })
    expect(localStorage.getItem(PENDING_INVITE_KEY)).toBeNull()
    expect(mocks.emitFriendsChanged).not.toHaveBeenCalled()
  })

  it('trata exceção da RPC sem quebrar o cadastro', async () => {
    localStorage.setItem(
      PENDING_INVITE_KEY,
      JSON.stringify({ tag: 'ana#1234', timestamp: 1_234 }),
    )
    mocks.acceptLinkInvite.mockRejectedValue(new Error('network'))

    const outcome = await completeSignupWithInvite()

    expect(outcome).toEqual({ hadInvite: true, accepted: false, playerTag: 'ana#1234' })
    expect(localStorage.getItem(PENDING_INVITE_KEY)).toBeNull()
    expect(mocks.emitFriendsChanged).not.toHaveBeenCalled()
  })
})