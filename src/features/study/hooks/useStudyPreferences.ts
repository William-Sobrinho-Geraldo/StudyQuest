import { useCallback, useState } from 'react'
import { readAlarmEnabled, writeAlarmEnabled } from '../lib/studyPreferences'

export interface StudyPreferences {
  alarmEnabled: boolean
  setAlarmEnabled: (enabled: boolean) => void
  toggleAlarm: () => void
}

export function useStudyPreferences(): StudyPreferences {
  const [alarmEnabled, setAlarmEnabledState] = useState<boolean>(() => readAlarmEnabled())

  const setAlarmEnabled = useCallback((enabled: boolean) => {
    writeAlarmEnabled(enabled)
    setAlarmEnabledState(enabled)
  }, [])

  const toggleAlarm = useCallback(() => {
    setAlarmEnabled(!readAlarmEnabled())
  }, [setAlarmEnabled])

  return {
    alarmEnabled,
    setAlarmEnabled,
    toggleAlarm,
  }
}
