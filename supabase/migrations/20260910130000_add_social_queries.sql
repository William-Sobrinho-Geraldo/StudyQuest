-- Social Module: RPCs de consulta (enriquecidas com player_tag)
-- RLS de profiles so permite SELECT da propria linha, entao preciso de funcoes
-- security definer para enriquecer friendships com tags/niveis dos pares.

-- 1. get_friends(): amizades aceitas (ambas direcoes)
create or replace function public.get_friends()
returns table (
  friendship_id uuid,
  peer_id uuid,
  peer_tag text,
  peer_level integer,
  peer_xp integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  return query
  select
    f.id,
    case
      when f.user_id = v_user then f.friend_id
      else f.user_id
    end::uuid,
    p.player_tag,
    p.level,
    p.current_xp,
    f.created_at
  from public.friendships f
  join public.profiles p
    on p.id = case
      when f.user_id = v_user then f.friend_id
      else f.user_id
    end
  where f.status = 'accepted'
    and (f.user_id = v_user or f.friend_id = v_user)
  order by p.player_tag asc nulls last;
end;
$$;

revoke all on function public.get_friends() from public;
grant execute on function public.get_friends() to authenticated;
grant execute on function public.get_friends() to service_role;


-- 2. get_pending_invites(): convites RECEBIDOS (pending, sou o friend_id)
create or replace function public.get_pending_invites()
returns table (
  friendship_id uuid,
  sender_id uuid,
  sender_tag text,
  sender_level integer,
  sender_xp integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  return query
  select
    f.id,
    f.user_id,
    p.player_tag,
    p.level,
    p.current_xp,
    f.created_at
  from public.friendships f
  join public.profiles p on p.id = f.user_id
  where f.status = 'pending'
    and f.friend_id = v_user
  order by f.created_at desc;
end;
$$;

revoke all on function public.get_pending_invites() from public;
grant execute on function public.get_pending_invites() to authenticated;
grant execute on function public.get_pending_invites() to service_role;


-- 3. count_pending_invites(): badge do header
create or replace function public.count_pending_invites()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_count bigint;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into v_count
  from public.friendships
  where status = 'pending' and friend_id = v_user;

  return v_count;
end;
$$;

revoke all on function public.count_pending_invites() from public;
grant execute on function public.count_pending_invites() to authenticated;
grant execute on function public.count_pending_invites() to service_role;