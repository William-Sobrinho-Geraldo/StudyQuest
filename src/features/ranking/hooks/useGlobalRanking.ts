import { useCallback, useEffect, useState } from 'react'
import { fetchGlobalRanking, fetchMyGlobalRank } from '../services/rankingService'
import type { GlobalRankingEntry, MyGlobalRank } from '../services/rankingService'
import type { GlobalRankingPeriod } from '../lib/periods'

export interface GlobalRankingState {
  ranking: GlobalRankingEntry[]
  myRank: MyGlobalRank | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export function useGlobalRanking(period: GlobalRankingPeriod): GlobalRankingState {
  const [ranking, setRanking] = useState<GlobalRankingEntry[]>([])
  const [myRank, setMyRank] = useState<MyGlobalRank | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [rankingData, myRankData] = await Promise.all([
        fetchGlobalRanking(period),
        fetchMyGlobalRank(period),
      ])
      setRanking(rankingData)
      setMyRank(myRankData)
    } catch (err) {
      setError('Não foi possível carregar o ranking.')
      console.error('useGlobalRanking: falha ao carregar ranking', err)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void load()
  }, [load])

  const reload = useCallback(async () => {
    setLoading(true)
    await load()
  }, [load])

  return { ranking, myRank, loading, error, reload }
}