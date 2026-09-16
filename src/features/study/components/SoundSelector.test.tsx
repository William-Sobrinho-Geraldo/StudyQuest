import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { SoundSelector } from './SoundSelector'

const playPreviewSoundMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/completionSounds', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/completionSounds')>()
  return { ...actual, playPreviewSound: playPreviewSoundMock }
})

beforeEach(() => {
  localStorage.clear()
  playPreviewSoundMock.mockClear()
})

describe('SoundSelector', () => {
  it('renderiza as quatro opções de som', () => {
    render(<SoundSelector onClose={vi.fn()} />)

    expect(screen.getByText('Sino de Cristal')).toBeInTheDocument()
    expect(screen.getByText('Fanfarra de Vitória')).toBeInTheDocument()
    expect(screen.getByText('Harpa Mágica')).toBeInTheDocument()
    expect(screen.getByText('Gongo de Combate')).toBeInTheDocument()
  })

  it('seleciona e persiste o som escolhido', () => {
    render(<SoundSelector onClose={vi.fn()} />)

    const fanfare = screen.getByRole('button', { name: /selecionar fanfarra de vitória/i })
    fireEvent.click(fanfare)

    expect(fanfare).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('studyquest:completion-sound')).toBe('victory_fanfare')
  })

  it('toca a pré-escuta ao clicar no botão de play', () => {
    render(<SoundSelector onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /ouvir harpa mágica/i }))

    expect(playPreviewSoundMock).toHaveBeenCalledWith('magic_harp')
  })

  it('fecha ao clicar em Concluído', () => {
    const onClose = vi.fn()
    render(<SoundSelector onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /concluído/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
