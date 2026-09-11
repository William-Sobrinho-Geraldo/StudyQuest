-- Social Module: remove_friend + Realtime para friendships
-- remove_friend usa auth.uid() (sem parametro de usuario exposto) para
-- garantir que apenas as duas partes da relacao possam apagar o registro.

create or replace function public.remove_friend(p_friendship_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_self uuid := auth.uid();
  v_user_id uuid;
  v_friend_id uuid;
begin
  if v_self is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if p_friendship_id is null then
    return jsonb_build_object('error', 'friendship_required');
  end if;

  select user_id, friend_id into v_user_id, v_friend_id
  from public.friendships
  where id = p_friendship_id;

  if v_user_id is null then
    return jsonb_build_object('error', 'friendship_not_found');
  end if;

  -- Somente as duas partes envolvidas podem remover a amizade
  if v_self <> v_user_id and v_self <> v_friend_id then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  delete from public.friendships
  where id = p_friendship_id;

  return jsonb_build_object('success', true, 'friendship_id', p_friendship_id);
end;
$$;

revoke all on function public.remove_friend(uuid) from public;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to service_role;

-- Garante que a tabela friendships esteja na publicacao Realtime
-- (idempotente: nao falha se ja estiver listada).
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end
$$;