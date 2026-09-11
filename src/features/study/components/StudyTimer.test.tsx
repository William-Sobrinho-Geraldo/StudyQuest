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
    expect(screen.getByRole('button', { name: /diminuir 5 minutos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /aumentar 5 minutos/i })).toBeInTheDocument()
    expect(screen.getByRole('slider')).toHaveValue('25')
  })

  it('permite ajustar a duração pelos botões e inicia a contagem', () => {
    renderTimer()

    fireEvent.click(screen.getByRole('button', { name: /aumentar 5 minutos/i }))
    expect(screen.getByRole('timer')).toHaveTextContent('30:00')

    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    expect(screen.getByRole('timer')).toHaveTextContent('29:00')
  })

  it('ajusta a duração pelo slider em blocos de 5 minutos', () => {
    renderTimer()

    fireEvent.change(screen.getByRole('slider'), { target: { value: '45' } })
    expect(screen.getByRole('timer')).toHaveTextContent('45:00')
    expect(screen.getByRole('slider')).toHaveValue('45')
  })

  it('respeita os limites de 5 e 90 minutos', () => {
    renderTimer()

    fireEvent.change(screen.getByRole('slider'), { target: { value: '5' } })
    expect(screen.getByRole('button', { name: /diminuir 5 minutos/i })).toBeDisabled()

    fireEvent.change(screen.getByRole('slider'), { target: { value: '90' } })
    expect(screen.getByRole('button', { name: /aumentar 5 minutos/i })).toBeDisabled()
  })

  it('oculta os controles de ajuste quando a sessão está em andamento', () => {
    renderTimer()

    expect(screen.getByRole('button', { name: /diminuir 5 minutos/i })).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }))

    expect(screen.queryByRole('button', { name: /diminuir 5 minutos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /aumentar 5 minutos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(screen.getByRole('timer')).toHaveTextContent('25:00')
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
