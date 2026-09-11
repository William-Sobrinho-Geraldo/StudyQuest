import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SHARE_TEXT,
  ShareAbortedError,
  buildInviteLink,
  buildWhatsAppLink,
  copyInviteLink,
  isMobileUserAgent,
  shareViaWhatsApp,
} from './shareInviteLink'

const mocks = vi.hoisted(() => ({
  nativePlatform: false,
  shareNative: vi.fn(),
  shareNativeError: null as Error | null,
}))

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mocks.nativePlatform,
  },
}))

vi.mock('@capacitor/share', () => ({
  Share: {
    share: (...args: unknown[]) => {
      if (mocks.shareNativeError) throw mocks.shareNativeError
      mocks.shareNative(...args)
      return Promise.resolve({ activityType: 'android.intent.action.SEND' })
    },
  },
}))

const clipboardWrite = vi.fn<() => Promise<void>>()
const windowOpen = vi.fn()
const webShare = vi.fn<() => Promise<void>>()

function setupNavigator(
  options: { ua: string; share?: typeof webShare | null; clipboard?: boolean } = {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0',
  },
) {
  Object.defineProperty(window, 'navigator', {
    value: {
      userAgent: options.ua,
      share: options.share === null ? undefined : options.share ?? webShare,
      clipboard: options.clipboard === false ? undefined : { writeText: clipboardWrite },
    },
    configurable: true,
    writable: true,
  })
  window.open = windowOpen
}

beforeEach(() => {
  mocks.nativePlatform = false
  mocks.shareNativeError = null
  clipboardWrite.mockReset()
  windowOpen.mockReset()
  webShare.mockReset()
  webShare.mockResolvedValue(undefined)
  clipboardWrite.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const MOBILE_UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'
const DESKTOP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0'

describe('isMobileUserAgent', () => {
  it('detecta Android', () => {
    expect(isMobileUserAgent('Mozilla/5.0 (Linux; Android 13) Mobile')).toBe(true)
  })

  it('detecta iPhone e iPad', () => {
    expect(isMobileUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe(true)
    expect(isMobileUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0)')).toBe(true)
  })

  it('retorna false para desktop', () => {
    expect(isMobileUserAgent(DESKTOP_UA)).toBe(false)
  })
})

describe('buildWhatsAppLink', () => {
  it('monta o wa.me com a mensagem e o link de convite', () => {
    const link = buildWhatsAppLink('william#8492')
    expect(link).toContain('https://wa.me/?text=')
    const decoded = decodeURIComponent(link.split('text=')[1])
    expect(decoded).toContain(SHARE_TEXT)
    expect(decoded).toContain(buildInviteLink('william#8492'))
  })
})

describe('copyInviteLink', () => {
  it('copia o link de convite e retorna a URL', async () => {
    setupNavigator({ ua: DESKTOP_UA })

    const url = await copyInviteLink('william#8492')

    expect(clipboardWrite).toHaveBeenCalledWith(buildInviteLink('william#8492'))
    expect(url).toBe(buildInviteLink('william#8492'))
  })

  it('propaga erro quando o clipboard não está disponível', async () => {
    clipboardWrite.mockRejectedValueOnce(new Error('not allowed'))
    setupNavigator({ ua: DESKTOP_UA })

    await expect(copyInviteLink('william#8492')).rejects.toThrow('not allowed')
  })
})

describe('shareViaWhatsApp — cascata de fallback', () => {
  it('usa @capacitor/share quando rodando em plataforma nativa', async () => {
    mocks.nativePlatform = true
    setupNavigator({ ua: MOBILE_UA })

    const result = await shareViaWhatsApp('william#8492')

    expect(mocks.shareNative).toHaveBeenCalledWith(
      expect.objectContaining({ url: buildInviteLink('william#8492') }),
    )
    expect(result.outcome).toBe('native')
    expect(windowOpen).not.toHaveBeenCalled()
  })

  it('usa navigator.share em dispositivo móvel PWA', async () => {
    setupNavigator({ ua: MOBILE_UA })

    const result = await shareViaWhatsApp('william#8492')

    expect(webShare).toHaveBeenCalledTimes(1)
    expect(result.outcome).toBe('web')
    expect(windowOpen).not.toHaveBeenCalled()
  })

  it('NUNCA aciona navigator.share no desktop — cai direto para wa.me + clipboard', async () => {
    setupNavigator({ ua: DESKTOP_UA, share: webShare })

    const result = await shareViaWhatsApp('william#8492')

    expect(webShare).not.toHaveBeenCalled()
    expect(windowOpen).toHaveBeenCalledWith(
      buildWhatsAppLink('william#8492'),
      '_blank',
      expect.stringContaining('noopener'),
    )
    expect(clipboardWrite).toHaveBeenCalledWith(buildInviteLink('william#8492'))
    expect(result.outcome).toBe('whatsapp')
  })

  it('cai para wa.me + clipboard quando o navigator.share mobile falha', async () => {
    webShare.mockRejectedValue(new Error('share failed'))
    setupNavigator({ ua: MOBILE_UA })

    const result = await shareViaWhatsApp('william#8492')

    expect(windowOpen).toHaveBeenCalled()
    expect(clipboardWrite).toHaveBeenCalled()
    expect(result.outcome).toBe('whatsapp')
  })

  it('relança erro quando o usuário cancela o navigator.share', async () => {
    const abort = new Error('aborted')
    abort.name = 'AbortError'
    webShare.mockRejectedValue(abort)
    setupNavigator({ ua: MOBILE_UA })

    await expect(shareViaWhatsApp('william#8492')).rejects.toBeInstanceOf(ShareAbortedError)
    expect(windowOpen).not.toHaveBeenCalled()
    expect(clipboardWrite).not.toHaveBeenCalled()
  })
})