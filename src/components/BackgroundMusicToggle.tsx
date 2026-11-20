import { Volume2, VolumeX } from 'lucide-react'
import { useBackgroundMusic } from '../hooks/useBackgroundMusic'

export function BackgroundMusicToggle() {
  const { isMuted, toggle } = useBackgroundMusic()

  return (
    <button
      type="button"
      onClick={toggle}
      data-testid="background-music-toggle"
      aria-label={isMuted ? 'Ativar música de fundo (unmute)' : 'Silenciar música de fundo (mute)'}
      title={isMuted ? 'Unmute' : 'Mute'}
      className="shrink-0 p-2 rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
    >
      {isMuted ? (
        <VolumeX className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Volume2 className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  )
}

export default BackgroundMusicToggle
