import { Capacitor } from '@capacitor/core'

export const INVITE_PATH = '/invite'

export type ShareOutcome = 'native' | 'web' | 'whatsapp'

export interface ShareInviteResult {
  outcome: ShareOutcome
  url: string
}

const SHARE_TEXT = 'Vem farmar XP comigo no StudyQuest!'

export function buildInviteLink(playerTag: string): string {
  const encodedTag = encodeURIComponent(playerTag)
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://studyquest.app'
  return `${origin}${INVITE_PATH}?ref=${encodedTag}`
}

export function buildWhatsAppLink(playerTag: string): string {
  const message = `${SHARE_TEXT} ${buildInviteLink(playerTag)}`
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}

export function isMobileUserAgent(userAgent: string): boolean {
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent)
}

export class ShareAbortedError extends Error {
  constructor() {
    super('user dismissed the share dialog')
    this.name = 'ShareAbortedError'
  }
}

function isShareAborted(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function isCapacitorCancelled(error: unknown): boolean {
  return error instanceof Error && error.message === 'Share canceled'
}

export async function shareInviteLink(playerTag: string): Promise<ShareInviteResult> {
  const url = buildInviteLink(playerTag)
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isMobile = isMobileUserAgent(userAgent)

  // 1. Capacitor nativo (build Android/iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title: 'StudyQuest',
        text: SHARE_TEXT,
        url,
        dialogTitle: 'Convidar para o StudyQuest',
      })
      return { outcome: 'native', url }
    } catch (error) {
      if (isCapacitorCancelled(error)) {
        throw new ShareAbortedError()
      }
      // Falha nativa: cai para a próxima tentativa.
    }
  }

  // 2. Web Share API — SOMENTE mobile (Android/iOS/iPad PWA).
  //    No desktop, a gaveta nativa do Windows falha ao resolver o WhatsApp.
  if (isMobile && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: 'StudyQuest',
        text: SHARE_TEXT,
        url,
      })
      return { outcome: 'web', url }
    } catch (error) {
      if (isShareAborted(error)) {
        throw new ShareAbortedError()
      }
      // Falha mobile: cai para o fallback do WhatsApp.
    }
  }

  // 3. Fallback final (Desktop e falhas anteriores): link universal wa.me.
  //    Abre o WhatsApp Web em nova aba e copia o link em paralelo.
  window.open(buildWhatsAppLink(playerTag), '_blank', 'noopener,noreferrer')
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // Clipboard indisponível (ex: WebView): o wa.me já resolve.
  }

  return { outcome: 'whatsapp', url }
}