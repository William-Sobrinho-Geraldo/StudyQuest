-- ============================================================
-- Sprints de Estudo: Grupos Competitivos Individuais temporários.
-- Fase 1: modelagem de dados + validações.
-- ============================================================

-- 1. Tabela sprints
-- ============================================================
create table public.sprints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_type text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  max_participants integer not null default 10,
  status text not null default 'active',
  constraint sprints_duration_type_check check (duration_type in ('1_week', '2_weeks', '1_month')),
  constraint sprints_status_check check (status in ('active', 'finished')),
  constraint sprints_max_participants_check check (max_participants > 0),
  constraint sprints_date_range_check check (end_date > start_date)
);

create index if not exists idx_sprints_status on public.sprints (status);
create index if not exists idx_sprints_created_by on public.sprints (created_by);


-- 2. Tabela sprint_participants
-- ============================================================
create table public.sprint_participants (
  id uuid primary key default gen_random_uuid(),
  sprint_id uuid not null references public.sprints (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint sprint_participants_unique_pair unique (sprint_id, user_id)
);

create index if not exists idx_sprint_participants_sprint_id on public.sprint_participants (sprint_id);
create index if not exists idx_sprint_participants_user_id on public.sprint_participants (user_id);


-- 3. Regra de ouro: um usuário só pode ter 1 sprint ativa
-- ============================================================
-- Uma partial unique index não pode referenciar a tabela sprints no WHERE,
-- então validamos via trigger (before insert/update).
create or replace function public.enforce_single_active_sprint()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_active_count integer;
  v_new_is_active boolean;
begin
  v_new_is_active := exists(
    select 1 from public.sprints s
    where s.id = new.sprint_id and s.status = 'active'
  );

  select count(*) into v_active_count
  from public.sprint_participants sp
  join public.sprints s on s.id = sp.sprint_id
  where sp.user_id = new.user_id
    and s.status = 'active'
    and sp.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000');

  -- Após o insert/update, o total de participações ativas (incluindo a linha nova,
  -- se a sprint for ativa) não pode ultrapassar 1.
  if v_active_count + (v_new_is_active::int) > 1 then
    raise exception 'user already has an active sprint';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_single_active_sprint on public.sprint_participants;
create trigger enforce_single_active_sprint
  before insert or update of sprint_id, user_id on public.sprint_participants
  for each row execute procedure public.enforce_single_active_sprint();


-- 4. Row Level Security
-- ============================================================
alter table public.sprints enable row level security;
alter table public.sprint_participants enable row level security;

-- Todos os autenticados podem ler sprints e participantes.
create policy sprints_select_authenticated on public.sprints
  for select to authenticated using (true);

create policy sprint_participants_select_authenticated on public.sprint_participants
  for select to authenticated using (true);

-- Qualquer autenticado pode criar uma sprint (assume o papel de criador).
create policy sprints_insert_creator on public.sprints
  for insert to authenticated with check (auth.uid() = created_by);

-- Apenas o criador pode atualizar detalhes da sprint.
create policy sprints_update_creator on public.sprints
  for update to authenticated
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- O usuário pode se inscrever apenas se não atingiu max_participants
-- e a sprint ainda está ativa.
create policy sprint_participants_insert_own on public.sprint_participants
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.sprints s
      where s.id = sprint_id
        and s.status = 'active'
        and (
          select count(*) from public.sprint_participants sp
          where sp.sprint_id = s.id
        ) < s.max_participants
    )
  );