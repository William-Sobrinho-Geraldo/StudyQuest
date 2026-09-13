import { useEffect } from 'react'
import { useToast } from './Toast'

export function ConnectivityListener() {
  const { showToast } = useToast()

  useEffect(() => {
    const handleOffline = () => {
      showToast('Você está jogando offline. Suas ações podem não ser salvas.', 'info')
    }

    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('offline', handleOffline)
    }
  }, [showToast])

  return null
}
