const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const EMAIL_INVALID_MESSAGE =
  'Email inválido. Use o formato correto: nome@exemplo.com (ex.: maria@gmail.com).'

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email)
}

export function translateAuthEmailError(error: string): string | null {
  if (/email address .* is invalid/i.test(error)) {
    return EMAIL_INVALID_MESSAGE
  }
  return null
}