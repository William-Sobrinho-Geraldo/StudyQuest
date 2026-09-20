import imageCompression from 'browser-image-compression'
import { Camera, Check, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../../components/Toast'
import { updateProfileAvatarUrl, uploadAvatarImage } from '../../../services/avatarService'

const COMPRESSION_OPTIONS = {
  maxWidthOrHeight: 800,
  initialQuality: 0.7,
}

export interface AvatarUploadProps {
  avatar_url?: string | null
  selected?: boolean
  onUploaded?: (url: string) => void
}

export function AvatarUpload({ avatar_url, selected = false, onUploaded }: AvatarUploadProps) {
  const { user, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const src = previewUrl ?? avatar_url

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  const handleClick = () => {
    if (!isLoading) inputRef.current?.click()
  }

  const clearPreview = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setPreviewUrl(null)
  }

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || isLoading) return

    event.target.value = ''
    setIsLoading(true)

    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
      const objectUrl = URL.createObjectURL(compressed)
      objectUrlRef.current = objectUrl
      setPreviewUrl(objectUrl)

      if (user) {
        const publicUrl = await uploadAvatarImage(user.id, compressed)
        await updateProfileAvatarUrl(user.id, publicUrl)
        onUploaded?.(publicUrl)
        await refreshProfile()
        showToast('Foto de perfil atualizada!')
      } else {
        showToast('Faça login para salvar sua nova foto.', 'error')
      }
    } catch {
      clearPreview()
      showToast('Falha ao enviar a foto. Tente novamente.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label="Minha Foto"
        aria-busy={isLoading}
        disabled={isLoading}
        onClick={handleClick}
        className={`relative flex min-h-[104px] touch-manipulation select-none flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-center text-xs font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:active:scale-100 ${
          selected
            ? 'border-indigo-500 bg-indigo-500/10 text-white ring-2 ring-indigo-500/40'
            : 'border-indigo-500/40 bg-indigo-500/5 text-slate-300 hover:border-indigo-400 hover:bg-indigo-500/10'
        }`}
      >
        <span className="relative">
          <span className="grid h-12 w-12 overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-violet-600">
            {src ? (
              <img src={src} alt="" aria-hidden="true" draggable={false} className="h-full w-full select-none object-cover" />
            ) : (
              <User className="h-1/2 w-1/2 place-self-center text-slate-300" aria-hidden="true" />
            )}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-slate-900 ring-2 ring-slate-700/60">
            <Camera className="h-3 w-3 text-indigo-300" aria-hidden="true" />
          </span>
        </span>
        <span className="w-full truncate">Minha Foto</span>
        {!src && (
          <span className="text-[9px] leading-tight text-slate-500">
            Toque para enviar sua foto
          </span>
        )}
        {selected && (
          <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-indigo-500">
            <Check className="h-3 w-3 text-white" aria-hidden="true" />
          </span>
        )}
        {isLoading && (
          <span className="absolute inset-0 grid place-items-center rounded-xl bg-slate-950/60">
            <span
              className="h-1/3 max-h-6 w-1/3 max-w-6 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden="true"
            />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  )
}