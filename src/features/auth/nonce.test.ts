import { describe, expect, it } from 'vitest'
import { generateNonce, sha256Hex } from './nonce'

describe('generateNonce', () => {
  it('gera 64 caracteres hexadecimais (32 bytes)', () => {
    const nonce = generateNonce()
    expect(nonce).toMatch(/^[0-9a-f]{64}$/)
  })

  it('gera valores distintos a cada chamada', () => {
    const a = generateNonce()
    const b = generateNonce()
    expect(a).not.toBe(b)
  })
})

describe('sha256Hex', () => {
  it('calcula o SHA-256 hex da string vazia', async () => {
    expect(await sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('calcula o SHA-256 hex de "abc"', async () => {
    expect(await sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
