import { useCallback, useState } from 'react'
import {
  readAlarmEnabled,
  readOvertimeEnabled,
  writeAlarmEnabled,
  writeOvertimeEnabled,
} from '../lib/studyPreferences'

export interface StudyPreferences {
  alarmEnabled: boolean
  overtimeEnabled: boolean
  shouldPlaySound: boolean
  setAlarmEnabled: (enabled: boolean) => void
  setOvertimeEnabled: (enabled: boolean) => void
  toggleAlarm: () => void
  toggleOvertime: () => void
}

export function useStudyPreferences(): StudyPreferences {
  const [alarmEnabled, setAlarmEnabledState] = useState<boolean>(() => readAlarmEnabled())
  const [overtimeEnabled, setOvertimeEnabledState] = useState<boolean>(() =>
    readOvertimeEnabled(),
  )

  const setAlarmEnabled = useCallback((enabled: boolean) => {
    writeAlarmEnabled(enabled)
    setAlarmEnabledState(enabled)
  }, [])

  const setOvertimeEnabled = useCallback((enabled: boolean) => {
    writeOvertimeEnabled(enabled)
    setOvertimeEnabledState(enabled)
    if (enabled) {
      writeAlarmEnabled(false)
      setAlarmEnabledState(false)
    }
  }, [])

  const toggleAlarm = useCallback(() => {
    setAlarmEnabled(!readAlarmEnabled())
  }, [setAlarmEnabled])

  const toggleOvertime = useCallback(() => {
    setOvertimeEnabled(!readOvertimeEnabled())
  }, [setOvertimeEnabled])

  const shouldPlaySound = !overtimeEnabled || alarmEnabled

  return {
    alarmEnabled,
    overtimeEnabled,
    shouldPlaySound,
    setAlarmEnabled,
    setOvertimeEnabled,
    toggleAlarm,
    toggleOvertime,
  }
}
