-- ============================================================
-- Expor o avatar do amigo em get_friends para o card social.
--
-- Re cria public.get_friends adicionando a coluna peer_avatar_id
-- (avatar_id do perfil do par), mantendo o contrato e permissões.
-- ============================================================

drop function if exists public.get_friends();

create or replace function public.get_friends()
returns table (
  friendship_id uuid,
  peer_id uuid,
  peer_tag text,
  peer_level integer,
  peer_xp integer,
  peer_avatar_id text,
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
    p.avatar_id,
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
