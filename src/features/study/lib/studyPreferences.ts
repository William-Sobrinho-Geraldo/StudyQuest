const ALARM_ENABLED_KEY = 'studyquest:alarm-enabled'
const OVERTIME_ENABLED_KEY = 'studyquest:overtime-enabled'

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

export function readOvertimeEnabled(): boolean {
  return readBoolean(OVERTIME_ENABLED_KEY, true)
}

export function writeOvertimeEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(OVERTIME_ENABLED_KEY, String(enabled))
}
