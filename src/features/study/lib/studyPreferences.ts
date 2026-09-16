const ALARM_ENABLED_KEY = 'studyquest:alarm-enabled'

function readBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  const raw = window.localStorage.getItem(key)
  if (raw === null) return fallback
  return raw === 'true'
}

export function readAlarmEnabled(): boolean {
  return readBoolean(ALARM_ENABLED_KEY, false)
}

export function writeAlarmEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ALARM_ENABLED_KEY, String(enabled))
}
