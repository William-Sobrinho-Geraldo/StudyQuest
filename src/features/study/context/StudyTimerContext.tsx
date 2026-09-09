import { createContext, useContext, type ReactNode } from 'react'
import { useStudyTimer } from '../hooks/useStudyTimer'

export type StudyTimerValue = ReturnType<typeof useStudyTimer>

const StudyTimerContext = createContext<StudyTimerValue | undefined>(undefined)

export function StudyTimerProvider({ children }: { children: ReactNode }) {
  const timer = useStudyTimer()
  return <StudyTimerContext.Provider value={timer}>{children}</StudyTimerContext.Provider>
}

export function useStudyTimerContext(): StudyTimerValue {
  const context = useContext(StudyTimerContext)
  if (!context) {
    throw new Error('useStudyTimerContext must be used within a StudyTimerProvider')
  }
  return context
}