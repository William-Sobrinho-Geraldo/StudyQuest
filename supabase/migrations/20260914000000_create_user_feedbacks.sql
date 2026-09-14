-- Feedback de Usuários
-- Tabela nativa para coletar feedback dos usuários dentro do app.
--   - type: 'bug' | 'suggestion' | 'other'
--   - status: 'pending' (padrão; usado pelo time para triagem)
-- RLS: usuários autenticados só inserem e leem seus próprios feedbacks.

create table if not exists public.user_feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null
    constraint user_feedbacks_type_check check (type in ('bug', 'suggestion', 'other')),
  message text not null
    constraint user_feedbacks_message_check check (length(trim(message)) > 0),
  status text not null default 'pending'
    constraint user_feedbacks_status_check check (status in ('pending', 'reviewing', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists user_feedbacks_user_idx on public.user_feedbacks (user_id);
create index if not exists user_feedbacks_created_at_idx on public.user_feedbacks (created_at desc);

-- Row Level Security: usuário autenticado só enxerga/insere os próprios registros.
alter table public.user_feedbacks enable row level security;

drop policy if exists user_feedbacks_select_own on public.user_feedbacks;
create policy user_feedbacks_select_own on public.user_feedbacks
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_feedbacks_insert_own on public.user_feedbacks;
create policy user_feedbacks_insert_own on public.user_feedbacks
  for insert to authenticated with check (user_id = auth.uid());

grant select, insert on public.user_feedbacks to authenticated;

-- Recarrega o schema no PostgREST (resolve o erro PGRST205 "Could not find the table").
notify pgrst, 'reload schema';
