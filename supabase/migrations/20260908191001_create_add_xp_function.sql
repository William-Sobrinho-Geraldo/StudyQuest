create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  level integer not null default 1,
  current_xp integer not null default 0,
  gold integer not null default 0,
  created_at timestamptz not null default now()
);

grant all on table public.profiles to anon, authenticated, service_role;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, level, current_xp, gold)
  values (new.id, 1, 0, 0)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.add_xp(p_xp integer, p_gold integer)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_level integer := 1;
  v_remaining bigint;
  v_need numeric;
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

  select coalesce(current_xp, 0) into v_remaining
  from public.profiles
  where id = auth.uid();

  v_remaining := v_remaining + p_xp;

  loop
    v_need := round(100 * power(v_level::numeric, 1.5::numeric));
    exit when v_remaining < v_need;
    v_remaining := v_remaining - v_need;
    v_level := v_level + 1;
  end loop;

  update public.profiles
  set current_xp = current_xp + p_xp,
      level = v_level,
      gold = gold + p_gold
  where id = auth.uid();

  return query
  select * from public.profiles where id = auth.uid();
end;
$$;

revoke all on function public.add_xp(integer, integer) from public;
grant execute on function public.add_xp(integer, integer) to authenticated;
grant execute on function public.add_xp(integer, integer) to service_role;