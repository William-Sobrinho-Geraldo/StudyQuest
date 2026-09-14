import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SplashScreen } from '@capacitor/splash-screen'
import { App } from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { CustomSplashScreen } from './components/ui/CustomSplashScreen'
import { initNativeApp } from './utils/capacitorInit'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found')
}

function Root() {
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    void SplashScreen.hide()
    void initNativeApp()
  }, [])

  if (showSplash) {
    return <CustomSplashScreen onComplete={() => setShowSplash(false)} />
  }

  return (
    <div className="animate-fade-in">
      <ErrorBoundary>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  )
}

createRoot(rootElement).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
