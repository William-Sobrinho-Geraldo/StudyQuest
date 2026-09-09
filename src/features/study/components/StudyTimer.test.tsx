import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StudyTimer } from './StudyTimer'
import { StudyTimerProvider } from '../context/StudyTimerContext'

const saveStudySessionMock = vi.hoisted(() => vi.fn().mockResolvedValue({}))

vi.mock('../services/studySessionService', () => ({
  saveStudySession: saveStudySessionMock,
}))

function renderTimer() {
  return render(
    <StudyTimerProvider>
      <StudyTimer />
    </StudyTimerProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  saveStudySessionMock.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('StudyTimer — UI', () => {
  it('renderiza o estado inicial com 25 min e 2 pausas disponíveis', () => {
    renderTimer()

    expect(screen.getByRole('timer')).toHaveTextContent('25:00')
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument()
    expect(screen.getByTestId('pauses-indicator')).toHaveTextContent('2/2')
    expect(screen.getByRole('button', { name: '5 min' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '60 min' })).toBeInTheDocument()
  })

  it('permite selecionar a duração e inicia a contagem', () => {
    renderTimer()

    fireEvent.click(screen.getByRole('button', { name: '30 min' }))
    expect(screen.getByRole('timer')).toHaveTextContent('30:00')

    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(screen.getByRole('timer')).toHaveTextContent('29:00')
  })

  it('bloqueia o botão de pausa após o limite de 2 pausas', () => {
    renderTimer()

    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }))

    fireEvent.click(screen.getByRole('button', { name: /pausar/i }))
    expect(screen.getByTestId('pauses-indicator')).toHaveTextContent('1/2')

    fireEvent.click(screen.getByRole('button', { name: /retomar/i }))
    fireEvent.click(screen.getByRole('button', { name: /pausar/i }))
    expect(screen.getByTestId('pauses-indicator')).toHaveTextContent('0/2')

    fireEvent.click(screen.getByRole('button', { name: /retomar/i }))
    expect(screen.getByRole('button', { name: /pausar/i })).toBeDisabled()
  })

  it('finaliza a sessão, calcula recompensas e salva no histórico', async () => {
    renderTimer()

    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }))

    await act(async () => {
      vi.advanceTimersByTime(25 * 60_000)
    })

    expect(screen.getByText('Sessão concluída!')).toBeInTheDocument()
    expect(screen.getByText('+250 XP')).toBeInTheDocument()
    expect(screen.getByText('+50 Gold')).toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('00:00')

    expect(saveStudySessionMock).toHaveBeenCalledTimes(1)
    expect(saveStudySessionMock).toHaveBeenCalledWith({
      durationMinutes: 25,
      xp: 250,
      gold: 50,
    })
  })

  it('permite reiniciar e iniciar uma nova sessão', async () => {
    renderTimer()

    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }))

    await act(async () => {
      vi.advanceTimersByTime(25 * 60_000)
    })

    fireEvent.click(screen.getByRole('button', { name: /nova sessão/i }))

    expect(screen.getByRole('timer')).toHaveTextContent('25:00')
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument()
  })
})
