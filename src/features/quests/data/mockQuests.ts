import { CalendarDays, ScrollText, Sun, type LucideIcon } from 'lucide-react'

export type QuestCategoryId = 'main' | 'daily' | 'weekly'

export interface QuestReward {
  xp: number
  gold: number
}

export interface Quest {
  id: string
  title: string
  reward: QuestReward
}

export interface QuestCategory {
  id: QuestCategoryId
  label: string
  description: string
  icon: LucideIcon
  quests: Quest[]
}

export const QUEST_CATEGORIES: QuestCategory[] = [
  {
    id: 'main',
    label: 'Quests Principais',
    description: 'Objetivos de longo prazo da sua jornada de estudos.',
    icon: ScrollText,
    quests: [
      {
        id: 'main-1',
        title: 'Estude 20 minutos por dia durante 7 dias seguidos',
        reward: { xp: 500, gold: 100 },
      },
      {
        id: 'main-2',
        title: 'Complete a sua primeira sessão de estudo',
        reward: { xp: 100, gold: 20 },
      },
      {
        id: 'main-3',
        title: 'Alcance o nível 10',
        reward: { xp: 400, gold: 80 },
      },
    ],
  },
  {
    id: 'daily',
    label: 'Quests Diárias',
    description: 'Novos objetivos a cada dia, com reset diário.',
    icon: Sun,
    quests: [
      {
        id: 'daily-1',
        title: 'Complete a sua meta diária de estudo',
        reward: { xp: 100, gold: 10 },
      },
      {
        id: 'daily-2',
        title: 'Conclua 3 sessões de estudo hoje',
        reward: { xp: 150, gold: 25 },
      },
      {
        id: 'daily-3',
        title: 'Acumule 60 minutos de estudo hoje',
        reward: { xp: 200, gold: 40 },
      },
    ],
  },
  {
    id: 'weekly',
    label: 'Quests Semanais',
    description: 'Metas da semana, com reset toda segunda-feira.',
    icon: CalendarDays,
    quests: [
      {
        id: 'weekly-1',
        title: 'Acumule 5 horas de estudo nesta semana',
        reward: { xp: 500, gold: 100 },
      },
      {
        id: 'weekly-2',
        title: 'Mantenha a sequência de estudos por 7 dias',
        reward: { xp: 600, gold: 120 },
      },
      {
        id: 'weekly-3',
        title: 'Complete 10 sessões nesta semana',
        reward: { xp: 400, gold: 80 },
      },
    ],
  },
]