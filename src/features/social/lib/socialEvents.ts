type FriendsChangedListener = () => void

const listeners = new Set<FriendsChangedListener>()

export function onFriendsChanged(listener: FriendsChangedListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emitFriendsChanged(): void {
  for (const listener of listeners) {
    listener()
  }
}