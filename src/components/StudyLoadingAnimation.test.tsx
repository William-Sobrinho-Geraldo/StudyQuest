import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { StudyLoadingAnimation } from './StudyLoadingAnimation'

const dotLottieHolder = vi.hoisted(() => {
  const instances: Array<{
    play: () => unknown
    pause: () => unknown
    destroy: () => unknown
    emit: (type: string) => void
  }> = []
  return { instances }
})

vi.mock('@lottiefiles/dotlottie-web', () => {
  class DotLottieMock {
    static setWasmUrl = vi.fn()
    private listeners = new Map<string, () => void>()
    play = vi.fn()
    pause = vi.fn()
    destroy = vi.fn()
    addEventListener = vi.fn((type: string, listener: () => void) => {
      this.listeners.set(type, listener)
    })
    removeEventListener = vi.fn((type: string) => {
      this.listeners.delete(type)
    })
    constructor() {
      dotLottieHolder.instances.push(this)
    }
    emit(type: string) {
      this.listeners.get(type)?.()
    }
  }
  return {
    DotLottie: DotLottieMock,
    setWasmUrl: vi.fn(),
  }
})

beforeEach(() => {
  dotLottieHolder.instances.length = 0
})

afterEach(() => {
  vi.clearAllMocks()
})

async function flushPlayerCreation() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('StudyLoadingAnimation', () => {
  it('renderiza fallback leve e o texto enquanto a animação não carrega', () => {
    render(<StudyLoadingAnimation text="Farmando XP..." />)

    expect(screen.getByText('Farmando XP...')).toBeInTheDocument()
    expect(screen.getByTestId('study-loading-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('study-loading-canvas')).toHaveClass('hidden')
  })

  it('mostra o canvas e esconde o fallback após a animação carregar', async () => {
    render(<StudyLoadingAnimation text="Farmando XP..." />)
    await flushPlayerCreation()

    const [player] = dotLottieHolder.instances
    expect(player).toBeDefined()

    act(() => {
      player.emit('load')
    })

    expect(screen.getByTestId('study-loading-canvas')).not.toHaveClass('hidden')
    expect(screen.queryByTestId('study-loading-fallback')).not.toBeInTheDocument()
  })

  it('mantém o fallback quando a animação falha ao carregar', async () => {
    render(<StudyLoadingAnimation text="Farmando XP..." />)
    await flushPlayerCreation()

    const [player] = dotLottieHolder.instances
    act(() => {
      player.emit('loadError')
    })

    expect(screen.getByTestId('study-loading-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('study-loading-canvas')).toHaveClass('hidden')
  })

  it('destrói o player do Lottie ao desmontar', async () => {
    const { unmount } = render(<StudyLoadingAnimation text="Farmando XP..." />)
    await flushPlayerCreation()

    const [player] = dotLottieHolder.instances
    unmount()

    expect(player.destroy).toHaveBeenCalledTimes(1)
  })

  it('pausa o player quando paused e retoma quando desativado', async () => {
    const { rerender } = render(<StudyLoadingAnimation text="Farmando XP..." />)
    await flushPlayerCreation()

    const [player] = dotLottieHolder.instances

    rerender(<StudyLoadingAnimation text="Farmando XP..." paused />)
    expect(player.pause).toHaveBeenCalled()

    rerender(<StudyLoadingAnimation text="Farmando XP..." paused={false} />)
    expect(player.play).toHaveBeenCalled()
  })

  it('não recria o player ao re-renderizar com as mesmas props (React.memo)', async () => {
    const { rerender } = render(<StudyLoadingAnimation text="Farmando XP..." />)
    await flushPlayerCreation()

    expect(dotLottieHolder.instances).toHaveLength(1)

    rerender(<StudyLoadingAnimation text="Farmando XP..." />)
    await flushPlayerCreation()

    expect(dotLottieHolder.instances).toHaveLength(1)
  })

  it('aplica className responsivo ao container no lugar do tamanho fixo', () => {
    render(<StudyLoadingAnimation text="Farmando XP..." className="h-72 w-72" />)

    const canvasContainer = screen.getByTestId('study-loading-canvas').parentElement
    expect(canvasContainer?.className).toContain('w-72')
    expect(canvasContainer?.style.width).toBe('')
  })
})