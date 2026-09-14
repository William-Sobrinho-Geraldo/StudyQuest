import { useEffect, useState } from 'react'

interface CustomSplashScreenProps {
  onComplete: () => void
}

export function CustomSplashScreen({ onComplete }: CustomSplashScreenProps) {
  const [width, setWidth] = useState('0%')

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setWidth('100%')
    }, 50)

    const endTimer = setTimeout(() => {
      onComplete()
    }, 3400)

    return () => {
      clearTimeout(startTimer)
      clearTimeout(endTimer)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end pb-16 bg-slate-950">
      <img
        src="/assets/splash.png"
        className="absolute inset-0 w-full h-full object-cover z-0"
        alt="Splash"
      />
      <div className="relative z-10 w-64">
        <div className="h-2 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 backdrop-blur-sm">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-amber-500 rounded-full transition-all ease-out duration-[3400ms]"
            style={{ width }}
          />
        </div>
      </div>
    </div>
  )
}
