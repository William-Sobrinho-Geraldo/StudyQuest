import type { QuestProgressRow } from '../services/questsService'

export type QuestStatus = 'claimable' | 'in-progress' | 'claimed'

export function getQuestStatus(quest: QuestProgressRow): QuestStatus {
  if (quest.claimed) return 'claimed'
  if (quest.current_value >= quest.target) return 'claimable'
  return 'in-progress'
}

export function countClaimableQuests(quests: QuestProgressRow[]): number {
  return quests.filter((quest) => getQuestStatus(quest) === 'claimable').length
}

export function sortQuestsByStatus(quests: QuestProgressRow[]): QuestProgressRow[] {
  const rank: Record<QuestStatus, number> = {
    claimable: 0,
    'in-progress': 1,
    claimed: 2,
  }

  return [...quests].sort((a, b) => rank[getQuestStatus(a)] - rank[getQuestStatus(b)])
}
