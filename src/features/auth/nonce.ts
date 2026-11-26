// Utilitários de nonce para o login nativo com Google (Credential Manager).
//
// O Supabase (`signInWithIdToken`) valida o nonce calculando SHA-256 (hex
// minúsculo) do nonce bruto e comparando com a claim `nonce` do ID token.
// Como o Google devolve exatamente o valor passado a `setNonce`, enviamos o
// HASH para o plugin e o nonce BRUTO para o Supabase.

// Gera um nonce aleatório criptograficamente forte (32 bytes), codificado em
// hexadecimal minúsculo.
export function generateNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Calcula o SHA-256 (hex minúsculo, 64 caracteres) de `value` usando Web Crypto.
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
