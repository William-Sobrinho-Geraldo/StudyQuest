-- ============================================================
-- Social Module: Player Tags + Friendships
-- ============================================================

-- 1. Adicionar coluna player_tag na tabela profiles
-- ============================================================
alter table public.profiles
  add column if not exists player_tag text;

-- Constraint de unicidade
alter table public.profiles
  add constraint profiles_player_tag_unique unique (player_tag);

-- Índice para buscas rápidas por tag
create index if not exists idx_profiles_player_tag on public.profiles (player_tag);


-- 2. Função para gerar player_tag automaticamente
-- Extrai o primeiro nome do email em auth.users, gera sufixo #XXXX aleatório
-- ============================================================
create or replace function public.generate_player_tag()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_base text;
  v_tag text;
  v_exists boolean;
  v_attempts integer := 0;
begin
  -- Se já tiver player_tag, não sobrescreve
  if new.player_tag is not null and new.player_tag <> '' then
    return new;
  end if;

  -- Buscar email do usuário em auth.users
  select email into v_email
  from auth.users
  where id = new.id;

  -- Extrair nome do email (parte antes do @), remover caracteres não-alfanuméricos
  v_base := lower(regexp_replace(
    split_part(coalesce(v_email, ''), '@', 1),
    '[^a-z0-9]', '', 'g'
  ));

  -- Fallback: se não conseguir extrair do email, usar 'player'
  if v_base = '' or v_base is null then
    v_base := 'player';
  end if;

  -- Truncar base para 12 caracteres
  v_base := left(v_base, 12);

  -- Gerar tag única com 4 dígitos aleatórios
  loop
    v_tag := v_base || '#' || lpad(floor(random() * 10000)::text, 4, '0');
    v_attempts := v_attempts + 1;

    -- Verificar se a tag já existe
    select exists(select 1 from public.profiles where player_tag = v_tag) into v_exists;

    exit when not v_exists;
    exit when v_attempts > 100; -- safety valve
  end loop;

  new.player_tag := v_tag;
  return new;
end;
$$;


-- 3. Trigger para auto-gerar player_tag no INSERT
-- ============================================================
drop trigger if exists profiles_generate_player_tag on public.profiles;
create trigger profiles_generate_player_tag
  before insert on public.profiles
  for each row execute procedure public.generate_player_tag();


-- 4. Backfill: gerar tags para usuários existentes sem tag
-- ============================================================
do $$
declare
  rec record;
  v_email text;
  v_base text;
  v_tag text;
  v_exists boolean;
  v_attempts integer;
begin
  for rec in
    select p.id, u.email
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.player_tag is null or p.player_tag = ''
  loop
    v_attempts := 0;

    -- Extrair nome do email (parte antes do @), remover caracteres não-alfanuméricos
    v_base := lower(regexp_replace(
      split_part(coalesce(rec.email, ''), '@', 1),
      '[^a-z0-9]', '', 'g'
    ));

    -- Fallback: se não conseguir extrair, derivar do id
    if v_base = '' or v_base is null then
      v_base := 'user' || left(replace(rec.id::text, '-', ''), 8);
    end if;

    v_base := left(v_base, 12);

    loop
      v_tag := v_base || '#' || lpad(floor(random() * 10000)::text, 4, '0');
      v_attempts := v_attempts + 1;

      select exists(select 1 from public.profiles where player_tag = v_tag) into v_exists;

      exit when not v_exists;
      exit when v_attempts > 100;
    end loop;

    update public.profiles
    set player_tag = v_tag
    where id = rec.id;
  end loop;
end;
$$;


-- 5. Tabela friendships
-- ============================================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    constraint friendships_status_check check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Impedir auto-add
  constraint friendships_no_self_add check (user_id <> friend_id)
);

-- Par único INDEPENDENTE da ordem: impede (A,B) e (B,A)
-- Usamos least/greatest porque uuid suporta ordenação
create unique index if not exists friendships_unique_pair_orderless
  on public.friendships (least(user_id, friend_id), greatest(user_id, friend_id));

-- Índices para queries comuns
create index if not exists idx_friendships_user_id on public.friendships (user_id);
create index if not exists idx_friendships_friend_id on public.friendships (friend_id);
create index if not exists idx_friendships_status on public.friendships (status);

-- RLS
alter table public.friendships enable row level security;

-- Políticas: cada usuário só vê amizades onde é user_id ou friend_id
create policy "friendships_select_own"
  on public.friendships for select
  using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_insert_own"
  on public.friendships for insert
  with check (auth.uid() = user_id);

create policy "friendships_update_own"
  on public.friendships for update
  using (auth.uid() = user_id or auth.uid() = friend_id);

-- 6. Trigger para atualizar updated_at
-- ============================================================
create or replace function public.handle_friendships_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists friendships_updated_at on public.friendships;
create trigger friendships_updated_at
  before update on public.friendships
  for each row execute procedure public.handle_friendships_updated_at();


-- 7. RPC: send_invite_by_tag
-- ============================================================
create or replace function public.send_invite_by_tag(p_target_tag text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender uuid := auth.uid();
  v_target_id uuid;
  v_existing_id uuid;
begin
  if v_sender is null then
    return jsonb_build_object('error', 'not_authenticated');
  end if;

  if p_target_tag is null or trim(p_target_tag) = '' then
    return jsonb_build_object('error', 'tag_required');
  end if;

  -- Buscar o target pelo player_tag
  select id into v_target_id
  from public.profiles
  where player_tag = trim(p_target_tag);

  if v_target_id is null then
    return jsonb_build_object('error', 'player_not_found');
  end if;

  -- Não pode adicionar a si mesmo
  if v_target_id = v_sender then
    return jsonb_build_object('error', 'cannot_add_self');
  end if;

  -- Verificar se já existe amizade (em qualquer direção)
  select id into v_existing_id
  from public.friendships
  where (user_id = v_sender and friend_id = v_target_id)
     or (user_id = v_target_id and friend_id = v_sender);

  if v_existing_id is not null then
    return jsonb_build_object('error', 'already_friends_or_pending', 'friendship_id', v_existing_id);
  end if;

  -- Inserir convite
  insert into public.friendships (user_id, friend_id, status)
  values (v_sender, v_target_id, 'pending')
  returning id into v_existing_id;

  return jsonb_build_object(
    'success', true,
    'friendship_id', v_existing_id,
    'target_tag', p_target_tag
  );
end;
$$;

revoke all on function public.send_invite_by_tag(text) from public;
grant execute on function public.send_invite_by_tag(text) to authenticated;
grant execute on function public.send_invite_by_tag(text) to service_role;


-- 8. RPC: accept_invite
-- ============================================================
create or replace function public.accept_invite(p_friendship_id uuid)
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

  -- Buscar a amizade
  select * into v_friendship
  from public.friendships
  where id = p_friendship_id;

  if v_friendship is null then
    return jsonb_build_object('error', 'friendship_not_found');
  end if;

  -- Somente o destinatário (friend_id) pode aceitar
  if v_friendship.friend_id <> v_user then
    return jsonb_build_object('error', 'not_authorized');
  end if;

  -- Já aceita?
  if v_friendship.status = 'accepted' then
    return jsonb_build_object('error', 'already_accepted');
  end if;

  -- Rejeitada?
  if v_friendship.status = 'rejected' then
    return jsonb_build_object('error', 'already_rejected');
  end if;

  -- Aceitar
  update public.friendships
  set status = 'accepted'
  where id = p_friendship_id;

  return jsonb_build_object(
    'success', true,
    'friendship_id', p_friendship_id,
    'status', 'accepted'
  );
end;
$$;

revoke all on function public.accept_invite(uuid) from public;
grant execute on function public.accept_invite(uuid) to authenticated;
grant execute on function public.accept_invite(uuid) to service_role;
