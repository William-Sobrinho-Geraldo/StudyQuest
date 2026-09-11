import { useCallback, useEffect, useState } from 'react'
import { fetchSprint, fetchSprintRankings } from '../services/sprintsService'
import type { Sprint } from '../../../types/sprints'
import type { SprintRankingEntry } from '../services/sprintsService'

export interface SprintState {
  sprint: Sprint | null
  rankings: SprintRankingEntry[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useSprint(sprintId: string): SprintState {
  const [sprint, setSprint] = useState<Sprint | null>(null)
  const [rankings, setRankings] = useState<SprintRankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, setTick] = useState(0)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [sprintData, rankingData] = await Promise.all([
        fetchSprint(sprintId),
        fetchSprintRankings(sprintId),
      ])
      setSprint(sprintData)
      setRankings(rankingData)
    } catch (err) {
      setError('Não foi possível carregar a sprint.')
      console.error('useSprint: falha ao carregar sprint', err)
    } finally {
      setLoading(false)
    }
  }, [sprintId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    await load()
  }, [load])

  return { sprint, rankings, loading, error, reload }
}