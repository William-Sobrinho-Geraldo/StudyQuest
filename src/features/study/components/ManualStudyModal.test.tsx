import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from '../../../components/Toast'
import { ManualStudyModal } from './ManualStudyModal'

const { rpc, from, getUser, emitStudySessionSaved } = vi.hoisted(() => ({
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  from: vi.fn(),
  getUser: vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  }),
  emitStudySessionSaved: vi.fn(),
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: { getUser },
    rpc,
    from,
  },
}))

vi.mock('../lib/studyEvents', () => ({ emitStudySessionSaved }))

const insertMock = vi.fn().mockResolvedValue({ data: null, error: null })

function mockInsert() {
  insertMock.mockClear()
  from.mockReturnValue({ insert: insertMock })
}

function OpenableModal({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(true)
  return (
    <ToastProvider>
      {open ? (
        <ManualStudyModal
          onClose={() => {
            onClose()
            setOpen(false)
          }}
        />
      ) : null}
    </ToastProvider>
  )
}

function renderModal() {
  return render(
    <ToastProvider>
      <ManualStudyModal onClose={vi.fn()} />
    </ToastProvider>,
  )
}

describe('ManualStudyModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInsert()
  })

  it('exibe o estado inicial sem cálculo de recompensas', () => {
    renderModal()

    expect(
      screen.getByRole('dialog', { name: /registar estudo offline/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Informe os minutos estudados para ver o cálculo/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrar sessão/i })).toBeDisabled()
  })

  it('calcula as recompensas em tempo real com a penalização de 70%', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Tempo estudado em minutos'), '60')

    expect(screen.getByTestId('manual-xp-base')).toHaveTextContent('600 XP')
    expect(screen.getByTestId('manual-xp-penalty')).toHaveTextContent('-420 XP')
    expect(screen.getByTestId('manual-xp-final')).toHaveTextContent('180 XP')
    expect(screen.getByTestId('manual-gold-final')).toHaveTextContent('36 Gold')
    expect(screen.getByText('Recompensa Final (30%)')).toBeInTheDocument()
  })

  it('bloqueia registro acima do limite antifraude de 180 minutos', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByLabelText('Tempo estudado em minutos'), '181')
    await user.click(screen.getByRole('button', { name: /registrar sessão/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'entre 1 e 180 minutos',
    )
  })

  it('registra a sessão manual no histórico e credita XP/Gold reduzidos', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<OpenableModal onClose={onClose} />)

    await user.type(screen.getByLabelText('Tempo estudado em minutos'), '60')
    await user.click(screen.getByRole('button', { name: /registrar sessão/i }))

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({
          duration_minutes: 60,
          xp: 180,
          gold: 36,
          is_manual: true,
        }),
      ])
    })
    expect(rpc).toHaveBeenCalledWith('add_xp', { p_xp: 180, p_gold: 36 })
    expect(emitStudySessionSaved).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(
      screen.queryByRole('dialog', { name: /registar estudo offline/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('Sessão de 60min registada! +180 XP (30%) adicionados'),
    ).toBeInTheDocument()
  })

  it('mantém o modal aberto e mostra erro quando o salvamento falha', async () => {
    const user = userEvent.setup()
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'rate limit' } })
    renderModal()

    await user.type(screen.getByLabelText('Tempo estudado em minutos'), '60')

    await act(async () => {
      await user.click(screen.getByRole('button', { name: /registrar sessão/i }))
    })

    expect(await screen.findByRole('alert')).toHaveTextContent('rate limit')
    expect(
      screen.getByRole('dialog', { name: /registar estudo offline/i }),
    ).toBeInTheDocument()
    expect(emitStudySessionSaved).not.toHaveBeenCalled()
  })
})