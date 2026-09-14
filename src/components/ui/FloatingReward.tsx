import { Coins, Sparkles } from 'lucide-react'

interface FloatingRewardProps {
  xp: number
  gold: number
  align?: 'center' | 'right'
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
  animation: floating-reward-float-up 2.5s ease-out forwards;
}
`

export function FloatingReward({ xp, gold, align = 'center' }: FloatingRewardProps) {
  return (
    <>
      <style>{floatUpStyles}</style>
      <div
        aria-hidden="true"
        data-testid="floating-reward"
        className={`floating-reward-float-up pointer-events-none absolute bottom-full z-50 mb-2 flex items-center gap-2 ${
          align === 'right' ? 'left-full ml-3' : 'inset-x-0 justify-center'
        }`}
      >
        <span className="flex items-center gap-1.5 text-xl font-bold text-sky-400">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
          + {formatNumber(xp)} XP
        </span>
        <span className="flex items-center gap-1.5 text-xl font-bold text-amber-300">
          <Coins className="h-5 w-5" aria-hidden="true" />
          + {formatNumber(gold)} Gold
        </span>
      </div>
    </>
  )
}
