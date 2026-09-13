import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'

type BackHandler = () => void

const backHandlerStack: BackHandler[] = []

export function pushBackHandler(handler: BackHandler): void {
  backHandlerStack.push(handler)
}

export function removeBackHandler(handler: BackHandler): void {
  const index = backHandlerStack.lastIndexOf(handler)
  if (index !== -1) {
    backHandlerStack.splice(index, 1)
  }
}

export function useModalBackHandler(onClose: () => void, open = true): void {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const handler: BackHandler = () => {
      onCloseRef.current()
    }

    pushBackHandler(handler)
    return () => {
      removeBackHandler(handler)
    }
  }, [open])
}

export function useNativeBackButton(): void {
  const navigate = useNavigate()

  useEffect(() => {
    let handle: PluginListenerHandle | undefined
    let disposed = false

    CapacitorApp.addListener('backButton', () => {
      const top = backHandlerStack[backHandlerStack.length - 1]
      if (top) {
        top()
        return
      }
      if (window.history.length > 1) {
        navigate(-1)
      }
    }).then((registered) => {
      if (disposed) {
        void registered.remove()
        return
      }
      handle = registered
    })

    return () => {
      disposed = true
      if (handle) {
        void handle.remove()
      }
    }
  }, [navigate])
}
