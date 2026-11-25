-- Corrige a Bênção do Mercador: garante o crédito de XP (além do Gold) e
-- padroniza o retorno para jsonb (objeto JSON real no cliente), alinhado com
-- get_public_profile. Re-cria a função de forma idempotente para corrigir
-- qualquer versão antiga que estivesse creditando apenas o Gold ou retornando
-- json (que o PostgREST pode devolver como string, quebrando o parsing do XP).
--
-- Obs.: é necessário dropar antes de recriar porque o tipo de retorno muda de
-- json (versão anterior) para jsonb.

drop function if exists public.claim_merchant_blessing();

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
  v_last_date date;
  v_xp integer := 100;
  v_gold integer := 30;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  v_today := (now() at time zone v_tz)::date;

  insert into public.profiles (id, level, current_xp, gold)
  values (v_user, 1, 0, 0)
  on conflict (id) do nothing;

  select daily_ad_views, daily_ad_views_date
    into v_count, v_last_date
  from public.profiles
  where id = v_user;

  if v_last_date is distinct from v_today then
    v_count := 0;
  end if;

  if v_count >= 10 then
    raise exception 'limite diario atingido';
  end if;

  update public.profiles
  set daily_ad_views = v_count + 1,
      daily_ad_views_date = v_today,
      current_xp = current_xp + v_xp,
      gold = gold + v_gold
  where id = v_user;

  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (v_user, v_xp, v_gold, 'ad', 'merchant_blessing');

  return jsonb_build_object(
    'xp', v_xp,
    'gold', v_gold,
    'daily_ad_views', v_count + 1,
    'limit', 10
  );
end;
$$;

revoke all on function public.claim_merchant_blessing() from public;
grant execute on function public.claim_merchant_blessing() to authenticated;
grant execute on function public.claim_merchant_blessing() to service_role;
