import { supabase } from '../../../lib/supabase'

export interface DuelOutcome {
  winner_id: string
  attacker_power: number
  defender_power: number
  honor_earned: number
}

export type DuelResult =
  | { success: true; outcome: DuelOutcome }
  | { success: false; error: string }

// Executa o duelo contra um alvo via RPC execute_duel e normaliza a resposta.
export async function executeDuel(
  attackerId: string,
  defenderId: string,
): Promise<DuelResult> {
  try {
    const { data, error } = await supabase.rpc('execute_duel', {
      p_attacker_id: attackerId,
      p_defender_id: defenderId,
    })
    if (error) return { success: false, error: error.message }

    const raw = data as Record<string, unknown> | null
    if (!raw) return { success: false, error: 'Não foi possível iniciar o duelo.' }
    if (typeof raw.error === 'string') return { success: false, error: raw.error }

    return {
      success: true,
      outcome: {
        winner_id: typeof raw.winner_id === 'string' ? raw.winner_id : '',
        attacker_power: typeof raw.attacker_power === 'number' ? raw.attacker_power : 0,
        defender_power: typeof raw.defender_power === 'number' ? raw.defender_power : 0,
        honor_earned: typeof raw.honor_earned === 'number' ? raw.honor_earned : 0,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Falha ao executar o duelo.',
    }
  }
}
