-- Reset automático (lazy) das Quests Diárias e Semanais.
--
-- O progresso (current_value/completed) já é calculado por janela temporal em
-- quest_current_value() (day/week/all), então "reseta" sozinho. O único estado
-- persistente por usuário é a reivindicação em public.quest_claims, que nunca é
-- removida — por isso diárias/semanais ficavam "Reivindicado" para sempre.
--
-- Esta RPC é chamada pelo front ANTES de buscar as quests (quest_progress()).
-- Ela remove as reivindicações cuja data já passou da janela atual, permitindo
-- completar e reivindicar novamente (farm contínuo). É idempotente e barata.
--
-- Coluna de rastreamento: quest_claims.claimed_at (a própria data da última
-- reivindicação). Não há necessidade de coluna last_reset adicional.

create or replace function public.sync_user_quests(p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text := 'America/Sao_Paulo';
  v_user uuid := coalesce(p_user_id, auth.uid());
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- Diárias: resetam na virada do dia (fuso do produto).
  delete from public.quest_claims c
  using public.quests q
  where c.quest_id = q.id
    and c.user_id = v_user
    and q.category = 'daily'
    and (c.claimed_at at time zone v_tz) < date_trunc('day', now() at time zone v_tz);

  -- Semanais: resetam na virada da semana (segunda-feira, fuso do produto).
  delete from public.quest_claims c
  using public.quests q
  where c.quest_id = q.id
    and c.user_id = v_user
    and q.category = 'weekly'
    and (c.claimed_at at time zone v_tz) < date_trunc('week', now() at time zone v_tz);
end;
$$;

revoke all on function public.sync_user_quests(uuid) from public;
grant execute on function public.sync_user_quests(uuid) to authenticated;
grant execute on function public.sync_user_quests(uuid) to service_role;
