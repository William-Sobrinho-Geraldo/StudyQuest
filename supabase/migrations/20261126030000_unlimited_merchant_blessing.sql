-- ============================================================
-- Bênção do Mercador: remove o limite diário.
--
-- O usuário pode assistir quantos anúncios quiser para acumular
-- XP/Gold (15 XP / 3 Gold por anúncio). A monetização é toda via
-- anúncios, então não há mais teto de resgates diários.
--
-- O contador daily_ad_views é mantido apenas para exibição
-- ("Resgates hoje: N"); o reset por dia-calendário continua.
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
  v_last_date date;
  v_xp integer := 15;
  v_gold integer := 3;
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

  -- Sem limite diário: o usuário pode assistir quantos anúncios quiser.
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
    'daily_ad_views', v_count + 1
  );
end;
$$;

revoke all on function public.claim_merchant_blessing() from public;
grant execute on function public.claim_merchant_blessing() to authenticated;
grant execute on function public.claim_merchant_blessing() to service_role;

notify pgrst, 'reload schema';
