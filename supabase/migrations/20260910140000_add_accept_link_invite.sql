-- Social Module: accept_link_invite
-- O link de convite carrega o consentimento implicito de quem gerou (remetente).
-- Portanto, o convidado (destinatario) ACEITA o convite e a amizade nasce
-- diretamente com status 'accepted', sem passar por 'pending'.

create or replace function public.accept_link_invite(p_sender_tag text, p_receiver_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_self uuid := auth.uid();
  v_sender_id uuid;
  v_friendship_id uuid;
begin
  if v_self is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  -- Omarcador recebido deve ser o proprio usuario autenticado
  if p_receiver_id <> v_self then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  if p_sender_tag is null or trim(p_sender_tag) = '' then
    return jsonb_build_object('error', 'tag_required');
  end if;

  -- Descobrir o remetente (quem gerou o link) pela player_tag
  select id into v_sender_id
  from public.profiles
  where player_tag = trim(p_sender_tag);

  if v_sender_id is null then
    return jsonb_build_object('error', 'player_not_found');
  end if;

  if v_sender_id = v_self then
    return jsonb_build_object('error', 'cannot_add_self');
  end if;

  -- Inserir (ou atualizar) a amizade ja como 'accepted'.
  -- O indice unico orderless (least/greatest) garante unicidade independente da ordem,
  -- entao tanto (A->B) quanto (B->A) sao tratados como o mesmo par.
  insert into public.friendships (user_id, friend_id, status)
  values (v_sender_id, v_self, 'accepted')
  on conflict ((least(user_id, friend_id)), (greatest(user_id, friend_id)))
  do update set status = 'accepted', updated_at = now()
  returning id into v_friendship_id;

  return jsonb_build_object(
    'success', true,
    'friendship_id', v_friendship_id,
    'sender_tag', p_sender_tag,
    'status', 'accepted'
  );
end;
$$;

revoke all on function public.accept_link_invite(text, uuid) from public;
grant execute on function public.accept_link_invite(text, uuid) to authenticated;
grant execute on function public.accept_link_invite(text, uuid) to service_role;