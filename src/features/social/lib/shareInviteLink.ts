import { Capacitor } from '@capacitor/core'

export const INVITE_PATH = '/invite'

export const PRODUCTION_URL = 'https://study-quest-wine.vercel.app'

export type ShareOutcome = 'native' | 'web' | 'whatsapp'

export interface ShareInviteResult {
  outcome: ShareOutcome
  url: string
}

export const SHARE_TEXT =
  'Sua rotina de estudos acaba de virar um RPG. Entre na minha party, venha farmar XP e evoluir no StudyQuest! 🗡️📚'

export function buildInviteLink(playerTag: string): string {
  const encodedTag = encodeURIComponent(playerTag)
  return `${PRODUCTION_URL}${INVITE_PATH}?ref=${encodedTag}`
}

export function buildWhatsAppLink(playerTag: string): string {
  const inviteUrl = buildInviteLink(playerTag)
  const textToShare = encodeURIComponent(`${SHARE_TEXT} ${inviteUrl}`)
  return `https://wa.me/?text=${textToShare}`
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

export async function copyInviteLink(playerTag: string): Promise<string> {
  const url = buildInviteLink(playerTag)
  await navigator.clipboard.writeText(url)
  return url
}

export async function shareViaWhatsApp(playerTag: string): Promise<ShareInviteResult> {
  const url = buildInviteLink(playerTag)
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isMobile = isMobileUserAgent(userAgent)

  // 1. Capacitor nativo (build Android/iOS): gaveta nativa do SO.
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title: 'Convite para a Party',
        text: SHARE_TEXT,
        url,
        dialogTitle: 'Convidar para o StudyQuest',
      })
      return { outcome: 'native', url }
    } catch (error) {
      if (isCapacitorCancelled(error)) {
        throw new ShareAbortedError()
      }
      // Falha nativa: cai para a abertura direta do WhatsApp.
    }
  } else if (isMobile && typeof navigator.share === 'function') {
    // 2. Web Share API — SOMENTE mobile (Android/iOS/iPad PWA).
    try {
      await navigator.share({
        title: 'Convite para a Party',
        text: SHARE_TEXT,
        url,
      })
      return { outcome: 'web', url }
    } catch (error) {
      if (isShareAborted(error)) {
        throw new ShareAbortedError()
      }
      // Falha mobile: cai para a abertura direta do WhatsApp.
    }
  }

  // 3. Desktop (e falhas mobile): abre o WhatsApp direto em nova aba e copia o link.
  window.open(buildWhatsAppLink(playerTag), '_blank', 'noopener,noreferrer')
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // Clipboard indisponível (ex: WebView): o wa.me já resolve.
  }

  return { outcome: 'whatsapp', url }
}