import { Coins, Sparkles } from 'lucide-react'

interface FloatingRewardProps {
  xp: number
  gold: number
}

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value)

const floatUpStyles = `
@keyframes floating-reward-float-up {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-30px);
  }
}
.floating-reward-float-up {
  animation: floating-reward-float-up 1.5s ease-out forwards;
}
`

export function FloatingReward({ xp, gold }: FloatingRewardProps) {
  return (
    <>
      <style>{floatUpStyles}</style>
      <div
        aria-hidden="true"
        data-testid="floating-reward"
        className="floating-reward-float-up pointer-events-none absolute inset-x-0 bottom-full z-50 mb-2 flex items-center justify-center gap-3"
      >
        <span className="flex items-center gap-1 text-sm font-bold text-sky-400">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          + {formatNumber(xp)} XP
        </span>
        <span className="flex items-center gap-1 text-sm font-bold text-amber-300">
          <Coins className="h-4 w-4" aria-hidden="true" />
          + {formatNumber(gold)} Gold
        </span>
      </div>
    </>
  )
}
