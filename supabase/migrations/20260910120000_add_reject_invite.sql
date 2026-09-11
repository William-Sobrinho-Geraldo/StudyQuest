-- Social Module: reject_invite RPC
-- Permite que o destinatario (friend_id) recuse um convite pendente

create or replace function public.reject_invite(p_friendship_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_friendship record;
begin
  if v_user is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  select * into v_friendship
  from public.friendships
  where id = p_friendship_id;

  if v_friendship is null then
    return jsonb_build_object('error', 'friendship_not_found');
  end if;

  -- Somente o destinatario (friend_id) pode recusar
  if v_friendship.friend_id <> v_user then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  -- Ja aceita? Nada a recusar.
  if v_friendship.status = 'accepted' then
    return jsonb_build_object('error', 'already_accepted');
  end if;

  -- Ja recusada?
  if v_friendship.status = 'rejected' then
    return jsonb_build_object('error', 'already_rejected');
  end if;

  update public.friendships
  set status = 'rejected'
  where id = p_friendship_id;

  return jsonb_build_object(
    'success', true,
    'friendship_id', p_friendship_id,
    'status', 'rejected'
  );
end;
$$;

revoke all on function public.reject_invite(uuid) from public;
grant execute on function public.reject_invite(uuid) to authenticated;
grant execute on function public.reject_invite(uuid) to service_role;