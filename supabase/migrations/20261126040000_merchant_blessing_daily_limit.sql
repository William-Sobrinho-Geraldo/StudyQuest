-- ============================================================
-- Bênção do Mercador: limite diário de 10 resgates.
--
-- Reintroduz o limite diário (10 por dia), com contagem atômica:
-- um único UPDATE condicional garante que chamadas simultâneas não
-- ultrapassem o limite. Sob READ COMMITTED, o WHERE é reavaliado na
-- linha mais recente após adquirir o lock — então a segunda chamada
-- concorrente afeta 0 linhas e recebe 'limite diario atingido'.
--
-- Virada do dia: America/Sao_Paulo (mesmo critério do restante do
-- app). Recompensa preservada: 15 XP / 3 Gold por anúncio.
--
-- Nota: este limite NÃO valida que o anúncio foi realmente assistido;
-- isso exige Server-Side Verification (SSV) à parte.
-- ============================================================

create or replace function public.claim_merchant_blessing()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_tz text := 'America/Sao_Paulo';
  v_today date;
  v_count integer;
  v_xp integer := 15;
  v_gold integer := 3;
  v_limit integer := 10;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  v_today := (now() at time zone v_tz)::date;

  insert into public.profiles (id, level, current_xp, gold)
  values (v_user, 1, 0, 0)
  on conflict (id) do nothing;

  -- Incremento atômico: reinicia a contagem na virada do dia e só credita
  -- enquanto estiver abaixo do limite. O WHERE reavaliado na linha mais
  -- recente impede corrida (race condition) entre chamadas simultâneas.
  update public.profiles
  set daily_ad_views =
        case when daily_ad_views_date = v_today then daily_ad_views + 1 else 1 end,
      daily_ad_views_date = v_today,
      current_xp = current_xp + v_xp,
      gold = gold + v_gold
  where id = v_user
    and (case when daily_ad_views_date = v_today then daily_ad_views else 0 end) < v_limit;

  if not found then
    raise exception 'limite diario atingido';
  end if;

  select daily_ad_views into v_count
  from public.profiles
  where id = v_user;

  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (v_user, v_xp, v_gold, 'ad', 'merchant_blessing');

  return jsonb_build_object(
    'xp', v_xp,
    'gold', v_gold,
    'daily_ad_views', v_count,
    'limit', v_limit
  );
end;
$$;

revoke all on function public.claim_merchant_blessing() from public;
grant execute on function public.claim_merchant_blessing() to authenticated;
grant execute on function public.claim_merchant_blessing() to service_role;

notify pgrst, 'reload schema';
