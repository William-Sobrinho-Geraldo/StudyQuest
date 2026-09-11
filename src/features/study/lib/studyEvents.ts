type StudySessionSavedListener = () => void

const listeners = new Set<StudySessionSavedListener>()

export function onStudySessionSaved(listener: StudySessionSavedListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitStudySessionSaved(): void {
  listeners.forEach((listener) => listener())
}