import { memo, useEffect, useRef, useState } from 'react'
import type { DotLottie } from '@lottiefiles/dotlottie-react'
import wasmUrl from '@lottiefiles/dotlottie-web/dotlottie-player.wasm?url'

export const FALLBACK_STUDY_ANIMATION_SRC = '/assets/animations/study-animation.lottie'

interface StudyLoadingAnimationProps {
  src?: string
  text?: string
  width?: number
  height?: number
  className?: string
  paused?: boolean
  devicePixelRatio?: number
}

export const StudyLoadingAnimation = memo(function StudyLoadingAnimation({
  src = FALLBACK_STUDY_ANIMATION_SRC,
  text,
  width = 96,
  height = 96,
  className,
  paused = false,
  devicePixelRatio = 1.5,
}: StudyLoadingAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const playerRef = useRef<DotLottie | null>(null)
  const pausedRef = useRef(paused)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    pausedRef.current = paused
    if (paused) playerRef.current?.pause()
    else playerRef.current?.play()
  }, [paused])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    let disposed = false
    let player: DotLottie | null = null

    const handleLoaded = () => {
      if (!disposed) setStatus('ready')
    }
    const handleLoadError = () => {
      if (!disposed) setStatus('failed')
    }

    // O motor do Lottie é carregado sob demanda (chunk separado) apenas quando
    // esta animação aparece na tela, mantendo o bundle inicial pequeno.
    void import('@lottiefiles/dotlottie-web')
      .then(({ DotLottie }) => {
        if (disposed) return
        DotLottie.setWasmUrl(wasmUrl)
        player = new DotLottie({
          canvas,
          src,
          autoplay: true,
          loop: true,
          layout: { fit: 'contain', align: [0.5, 0.5] },
          renderConfig: { autoResize: true, freezeOnOffscreen: true, devicePixelRatio },
        })
        if (disposed) {
          player.destroy()
          player = null
          return
        }
        playerRef.current = player
        player.addEventListener('load', handleLoaded)
        player.addEventListener('loadError', handleLoadError)
        if (pausedRef.current) player.pause()
      })
      .catch(() => {
        if (!disposed) setStatus('failed')
      })

    return () => {
      disposed = true
      if (player) {
        player.removeEventListener('load', handleLoaded)
        player.removeEventListener('loadError', handleLoadError)
        player.destroy()
      }
      playerRef.current = null
    }
  }, [src, devicePixelRatio])

  return (
    <div
      role="status"
      aria-label={text ?? undefined}
      className="flex h-full w-full min-h-0 flex-col items-center justify-center"
    >
      <div
        className={`relative ${className ?? ''}`}
        style={className ? undefined : { width, height }}
      >
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          data-testid="study-loading-canvas"
          className={status === 'ready' ? 'absolute inset-0 h-full w-full object-contain' : 'hidden'}
        />
        {status !== 'ready' && (
          <div
            aria-hidden="true"
            data-testid="study-loading-fallback"
            className="absolute inset-0 grid place-items-center"
          >
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        )}
      </div>
      {text ? (
        <p className="mt-3 animate-pulse text-sm font-medium tracking-wide text-slate-400">{text}</p>
      ) : null}
    </div>
  )
})