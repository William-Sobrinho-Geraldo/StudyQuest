import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { BackgroundMusicSelector } from './BackgroundMusicSelector'

beforeEach(() => {
  localStorage.clear()
})

function openModal() {
  fireEvent.click(screen.getByRole('button', { name: /escolher som de concentração/i }))
}

describe('BackgroundMusicSelector', () => {
  it('abre o modal e lista as quatro faixas', () => {
    render(<BackgroundMusicSelector />)

    openModal()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Foco Calmo')).toBeInTheDocument()
    expect(screen.getByText('Concentração Ativa')).toBeInTheDocument()
    expect(screen.getByText('Aventura de Piratas')).toBeInTheDocument()
    expect(screen.getByText('RPG Agitado')).toBeInTheDocument()
  })

  it('renderiza no portal, fora do cabeçalho', () => {
    render(
      <header>
        <BackgroundMusicSelector />
      </header>,
    )

    openModal()

    const dialog = screen.getByRole('dialog')
    expect(document.body.contains(dialog)).toBe(true)
    expect(dialog.closest('header')).toBeNull()
  })

  it('seleciona e persiste uma faixa', () => {
    render(<BackgroundMusicSelector />)

    openModal()

    const battle = screen.getByRole('button', { name: /selecionar rpg agitado/i })
    fireEvent.click(battle)

    expect(battle).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('studyquest:bg-music-track')).toBe('battle')
  })

  it('fecha ao clicar no botão X do cabeçalho', () => {
    render(<BackgroundMusicSelector />)

    openModal()
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('fecha ao pressionar Escape', () => {
    render(<BackgroundMusicSelector />)

    openModal()
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('fecha ao clicar em Concluído', () => {
    render(<BackgroundMusicSelector />)

    openModal()
    fireEvent.click(screen.getByRole('button', { name: /concluído/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
