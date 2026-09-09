-- Curva de dificuldade por faixas (espelha src/utils/leveling.ts):
-- 1-15: +15% | 16-25: +12% | 26-40: +10% | 41-60: +8% | 61-80: +6% | 81-100: +4% | 101+: +3%

create or replace function public.level_from_xp(p_xp bigint)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_level integer := 1;
  v_remaining bigint := greatest(coalesce(p_xp, 0), 0);
  v_need numeric := 100;
begin
  loop
    exit when v_remaining < v_need;
    v_remaining := v_remaining - v_need;
    v_level := v_level + 1;
    v_need := round(v_need * (1 + (
      case
        when v_level between 1 and 15 then 0.15
        when v_level between 16 and 25 then 0.12
        when v_level between 26 and 40 then 0.10
        when v_level between 41 and 60 then 0.08
        when v_level between 61 and 80 then 0.06
        when v_level between 81 and 100 then 0.04
        else 0.03
      end)));
  end loop;
  return v_level;
end;
$$;

grant execute on function public.level_from_xp(bigint) to authenticated;
grant execute on function public.level_from_xp(bigint) to service_role;

create or replace function public.sync_profile_level()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.level := public.level_from_xp(new.current_xp);
  return new;
end;
$$;

drop trigger if exists profiles_sync_level_on_xp on public.profiles;
create trigger profiles_sync_level_on_xp
  before update of current_xp on public.profiles
  for each row execute procedure public.sync_profile_level();

-- level é derivado do xp pelo trigger: só se escreve via trigger.
-- Remover UPDATE de tabela e conceder apenas nas colunas editáveis.
revoke update on public.profiles from anon;
revoke update on public.profiles from authenticated;
grant update (current_xp, gold) on public.profiles to authenticated;

create or replace function public.add_xp(p_xp integer, p_gold integer)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_xp is null or p_gold is null then
    raise exception 'xp and gold are required';
  end if;

  if p_xp < 0 or p_gold < 0 then
    raise exception 'xp and gold must not be negative';
  end if;

  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.profiles (id, level, current_xp, gold)
  values (auth.uid(), 1, 0, 0)
  on conflict (id) do nothing;

  update public.profiles
  set current_xp = current_xp + p_xp,
      gold = gold + p_gold
  where id = auth.uid();

  return query
  select * from public.profiles where id = auth.uid();
end;
$$;

revoke all on function public.add_xp(integer, integer) from public;
grant execute on function public.add_xp(integer, integer) to authenticated;
grant execute on function public.add_xp(integer, integer) to service_role;