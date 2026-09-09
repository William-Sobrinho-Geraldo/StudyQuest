export const REWARD_COLORS = {
  xp: 'text-indigo-300',
  xpIcon: 'text-indigo-300',
  gold: 'text-amber-400',
  goldIcon: 'text-amber-400',
} as const

export type RewardColor = (typeof REWARD_COLORS)[keyof typeof REWARD_COLORS]