-- Catálogo de quests + reivindicações + log de recompensas.
-- Fonte de verdade: banco. O front consome quest_progress() (cálculo server-side).

create table if not exists public.quests (
  id text primary key,
  category text not null check (category in ('daily', 'weekly', 'main')),
  trail text,
  title text not null,
  description text not null,
  metric text not null,
  period text not null check (period in ('day', 'week', 'all')),
  target numeric not null check (target > 0),
  reward_xp integer not null default 0 check (reward_xp >= 0),
  reward_gold integer not null default 0 check (reward_gold >= 0),
  enabled boolean not null default true
);

create table if not exists public.quest_claims (
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id text not null references public.quests(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

create index if not exists quest_claims_user_timestamp_idx
  on public.quest_claims (user_id, claimed_at);

-- Registro de ganhos de XP/Gold (fonte 'study' pelas sessões, 'quest' pelas quests).
-- Permite rastrear "Gold ganho no dia" (quest Caçador de Ouro) sem depender do saldo total.
create table if not exists public.rewards_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  gold integer not null default 0 check (gold >= 0),
  source text not null,
  source_id text,
  created_at timestamptz not null default now()
);

create index if not exists rewards_log_user_timestamp_idx
  on public.rewards_log (user_id, created_at);

-- Janela de progresso no fuso do produto (America/Sao_Paulo).
-- 'week' inicia na segunda-feira (date_trunc de week).
create or replace function public.quest_current_value(p_user uuid, p_metric text, p_period text)
returns bigint
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tz text := 'America/Sao_Paulo';
  v_start timestamp;
begin
  if p_user is null or p_metric is null then
    return 0;
  end if;

  if p_period = 'day' then
    v_start := date_trunc('day', now() at time zone v_tz);
  elsif p_period = 'week' then
    v_start := date_trunc('week', now() at time zone v_tz);
  else
    v_start := timestamp '-infinity';
  end if;

  case p_metric
    when 'sessions' then
      return (select count(*)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null
          and (s.completed_at at time zone v_tz) >= v_start);
    when 'minutes' then
      return (select coalesce(sum(s.duration_minutes), 0)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null
          and (s.completed_at at time zone v_tz) >= v_start);
    when 'single_session_minutes' then
      return (select coalesce(max(s.duration_minutes), 0)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null
          and (s.completed_at at time zone v_tz) >= v_start);
    when 'gold_earned' then
      return (select coalesce(sum(r.gold), 0)::bigint
        from public.rewards_log r
        where r.user_id = p_user
          and (r.created_at at time zone v_tz) >= v_start);
    when 'daily_quests_claimed' then
      return (select count(*)::bigint
        from public.quest_claims c
        where c.user_id = p_user
          and c.quest_id like 'daily-%'
          and (c.claimed_at at time zone v_tz) >= v_start);
    when 'study_days_30' then
      return (select count(*)::bigint
        from (
          select 1
          from public.study_sessions s
          where s.user_id = p_user
            and s.completed_at is not null
            and (s.completed_at at time zone v_tz) >= v_start
          group by (s.completed_at at time zone v_tz)::date
          having sum(s.duration_minutes) >= 30
        ) d);
    when 'level' then
      return (select coalesce(p.level, 0)::bigint
        from public.profiles p
        where p.id = p_user);
    when 'gold_total' then
      return (select coalesce(p.gold, 0)::bigint
        from public.profiles p
        where p.id = p_user);
    when 'minutes_total' then
      return (select coalesce(sum(s.duration_minutes), 0)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null);
    when 'sessions_total' then
      return (select count(*)::bigint
        from public.study_sessions s
        where s.user_id = p_user
          and s.completed_at is not null);
    else
      -- métricas da Forja ainda não possuem fonte de dados: progresso 0.
      return 0;
  end case;
end;
$$;

-- Progresso de todas as quests para o usuário da sessão.
create or replace function public.quest_progress()
returns table (
  id text,
  category text,
  trail text,
  title text,
  description text,
  metric text,
  period text,
  target numeric,
  reward_xp integer,
  reward_gold integer,
  enabled boolean,
  current_value bigint,
  completed boolean,
  claimed boolean
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
  select q.id, q.category, q.trail, q.title, q.description, q.metric, q.period, q.target,
         q.reward_xp, q.reward_gold, q.enabled,
         cv.current_value,
         (cv.current_value >= q.target) and q.enabled as completed,
         exists (
           select 1 from public.quest_claims c
           where c.user_id = v_user and c.quest_id = q.id
         ) as claimed
  from public.quests q
  cross join lateral (
    values (public.quest_current_value(v_user, q.metric, q.period))
  ) as cv(current_value)
  order by case q.category when 'daily' then 1 when 'weekly' then 2 else 3 end,
           coalesce(q.trail, ''), q.id;
end;
$$;

-- Reivindica uma quest concluída: valida server-side, marca como reivindicada
-- e soma XP/Gold ao perfil (nível derivado pelo trigger de current_xp).
create or replace function public.claim_quest(p_quest_id text)
returns setof public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_quest public.quests%rowtype;
  v_current bigint;
  v_inserted text;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  if p_quest_id is null or p_quest_id = '' then
    raise exception 'quest nao informada';
  end if;

  select * into v_quest from public.quests where id = p_quest_id;
  if not found then
    raise exception 'quest desconhecida';
  end if;

  if not v_quest.enabled then
    raise exception 'quest indisponivel';
  end if;

  insert into public.quest_claims (user_id, quest_id)
  values (v_user, p_quest_id)
  on conflict (user_id, quest_id) do nothing
  returning quest_id into v_inserted;

  if v_inserted is null then
    raise exception 'quest ja reivindicada';
  end if;

  v_current := public.quest_current_value(v_user, v_quest.metric, v_quest.period);
  if v_current < v_quest.target then
    raise exception 'quest nao concluida';
  end if;

  insert into public.profiles (id, level, current_xp, gold)
  values (v_user, 1, 0, 0)
  on conflict (id) do nothing;

  update public.profiles
  set current_xp = current_xp + v_quest.reward_xp,
      gold = gold + v_quest.reward_gold
  where id = v_user;

  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (v_user, v_quest.reward_xp, v_quest.reward_gold, 'quest', p_quest_id);

  return query select * from public.profiles where id = v_user;
end;
$$;

-- add_xp passa a registrar ganhos de estudo no rewards_log (fonte 'study').
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

  insert into public.rewards_log (user_id, xp, gold, source, source_id)
  values (auth.uid(), p_xp, p_gold, 'study', null);

  return query
  select * from public.profiles where id = auth.uid();
end;
$$;

revoke all on function public.add_xp(integer, integer) from public;
grant execute on function public.add_xp(integer, integer) to authenticated;
grant execute on function public.add_xp(integer, integer) to service_role;

revoke all on function public.quest_current_value(uuid, text, text) from public;
grant execute on function public.quest_current_value(uuid, text, text) to service_role;

revoke all on function public.quest_progress() from public;
grant execute on function public.quest_progress() to authenticated;
grant execute on function public.quest_progress() to service_role;

revoke all on function public.claim_quest(text) from public;
grant execute on function public.claim_quest(text) to authenticated;
grant execute on function public.claim_quest(text) to service_role;

alter table public.quests enable row level security;
alter table public.quest_claims enable row level security;
alter table public.rewards_log enable row level security;

create policy quests_select_authenticated on public.quests
  for select to authenticated using (true);

create policy quest_claims_select_own on public.quest_claims
  for select to authenticated using (user_id = auth.uid());

grant select on public.quests to authenticated;

-- Seed do catálogo (65 quests).
insert into public.quests (id, category, trail, title, description, metric, period, target, reward_xp, reward_gold) values
('daily-1', 'daily', null, 'Aquecimento', 'Complete 1 sessão de foco (qualquer duração).', 'sessions', 'day', 1, 100, 20),
('daily-2', 'daily', null, 'Ritmo de Estudo', 'Complete 2 sessões de foco hoje.', 'sessions', 'day', 2, 200, 40),
('daily-3', 'daily', null, 'Máquina de Foco', 'Complete 4 sessões de foco hoje.', 'sessions', 'day', 4, 400, 80),
('daily-4', 'daily', null, 'Primeiro Passo', 'Acumule 30 minutos de estudo.', 'minutes', 'day', 30, 100, 25),
('daily-5', 'daily', null, 'Dedicação Diária', 'Acumule 50 minutos de estudo.', 'minutes', 'day', 50, 250, 50),
('daily-6', 'daily', null, 'Maratona Diária', 'Acumule 90 minutos de estudo.', 'minutes', 'day', 90, 450, 100),
('daily-7', 'daily', null, 'Sessão Profunda', 'Complete uma única sessão de 40 minutos ou mais.', 'single_session_minutes', 'day', 40, 300, 60),
('daily-8', 'daily', null, 'Caçador de Ouro', 'Acumule ganhos de 100 de Gold em um único dia.', 'gold_earned', 'day', 100, 150, 30),
('daily-9', 'daily', null, 'O Aprendiz da Forja', 'Faça 1 tentativa de refino no dia.', 'forge', 'day', 1, 50, 10),
('weekly-1', 'weekly', null, 'Resiliência Semanal', 'Acumule 150 minutos (2.5 horas) de estudo na semana.', 'minutes', 'week', 150, 800, 150),
('weekly-2', 'weekly', null, 'Mestre do Tempo', 'Acumule 350 minutos (aprox. 6 horas) de estudo na semana.', 'minutes', 'week', 350, 2000, 400),
('weekly-3', 'weekly', null, 'Rotina Implacável', 'Complete 10 sessões de foco na semana.', 'sessions', 'week', 10, 1000, 200),
('weekly-4', 'weekly', null, 'Operário da Forja', 'Faça 5 tentativas de refino na semana.', 'forge', 'week', 5, 400, 80),
('weekly-5', 'weekly', null, 'Sorte na Bigorna', 'Alcance o nível de refino +3 em qualquer equipamento.', 'forge', 'week', 3, 1000, 500),
('weekly-6', 'weekly', null, 'Caçador de Recompensas', 'Conclua 10 Quests Diárias nesta semana.', 'daily_quests_claimed', 'week', 10, 1500, 300),
('weekly-7', 'weekly', null, 'Chama Inapagável', 'Estude pelo menos 30 minutos por 3 dias na mesma semana.', 'study_days_30', 'week', 3, 1200, 250),
('main-level-1', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Início da Jornada', 'Alcance o nível 5.', 'level', 'all', 5, 1000, 200),
('main-level-2', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Aventureiro', 'Alcance o nível 10.', 'level', 'all', 10, 2500, 500),
('main-level-3', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Explorador de Conhecimento', 'Alcance o nível 15.', 'level', 'all', 15, 5000, 1000),
('main-level-4', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Especialista', 'Alcance o nível 20.', 'level', 'all', 20, 8000, 1500),
('main-level-5', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Veterano', 'Alcance o nível 30.', 'level', 'all', 30, 15000, 3000),
('main-level-6', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Mestre', 'Alcance o nível 40.', 'level', 'all', 40, 25000, 5000),
('main-level-7', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Sábio do Reino', 'Alcance o nível 50.', 'level', 'all', 50, 40000, 8000),
('main-level-8', 'main', 'Trilha de Nível (O Despertar do Herói)', 'A Lenda Viva', 'Alcance o nível 60.', 'level', 'all', 60, 60000, 12000),
('main-level-9', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Semideus do Foco', 'Alcance o nível 75.', 'level', 'all', 75, 100000, 20000),
('main-level-10', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Guardião Ancestral', 'Alcance o nível 85.', 'level', 'all', 85, 150000, 30000),
('main-level-11', 'main', 'Trilha de Nível (O Despertar do Herói)', 'O Titã do Conhecimento', 'Alcance o nível 95.', 'level', 'all', 95, 200000, 40000),
('main-level-12', 'main', 'Trilha de Nível (O Despertar do Herói)', 'A Divindade Acadêmica', 'Alcance o nível 100.', 'level', 'all', 100, 250000, 50000),
('main-time-1', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '100 Minutos Acumulados', 'Acumule 100 minutos de estudo no total.', 'minutes_total', 'all', 100, 500, 100),
('main-time-2', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '500 Minutos Acumulados', 'Acumule 500 minutos de estudo no total.', 'minutes_total', 'all', 500, 2000, 400),
('main-time-3', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '1.000 Minutos Acumulados', 'Acumule 1.000 minutos de estudo no total.', 'minutes_total', 'all', 1000, 4000, 800),
('main-time-4', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '2.500 Minutos Acumulados', 'Acumule 2.500 minutos de estudo no total.', 'minutes_total', 'all', 2500, 10000, 2000),
('main-time-5', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '5.000 Minutos Acumulados', 'Acumule 5.000 minutos de estudo no total.', 'minutes_total', 'all', 5000, 20000, 4000),
('main-time-6', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '10.000 Minutos Acumulados', 'Acumule 10.000 minutos de estudo no total.', 'minutes_total', 'all', 10000, 45000, 9000),
('main-time-7', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '25.000 Minutos Acumulados', 'Acumule 25.000 minutos de estudo no total.', 'minutes_total', 'all', 25000, 100000, 20000),
('main-time-8', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '50.000 Minutos Acumulados', 'Acumule 50.000 minutos de estudo no total.', 'minutes_total', 'all', 50000, 250000, 50000),
('main-time-9', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '65.000 Minutos Acumulados', 'Acumule 65.000 minutos de estudo no total.', 'minutes_total', 'all', 65000, 350000, 65000),
('main-time-10', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '80.000 Minutos Acumulados', 'Acumule 80.000 minutos de estudo no total.', 'minutes_total', 'all', 80000, 450000, 80000),
('main-time-11', 'main', 'Trilha de Tempo (Os Arquivos de Alexandria)', '100.000 Minutos Acumulados', 'Acumule 100.000 minutos de estudo no total.', 'minutes_total', 'all', 100000, 600000, 100000),
('main-sessions-1', 'main', 'Trilha de Sessões (Veterano de Guerra)', '10 Sessões Concluídas', 'Complete 10 sessões de estudo no total.', 'sessions_total', 'all', 10, 500, 100),
('main-sessions-2', 'main', 'Trilha de Sessões (Veterano de Guerra)', '50 Sessões Concluídas', 'Complete 50 sessões de estudo no total.', 'sessions_total', 'all', 50, 2500, 500),
('main-sessions-3', 'main', 'Trilha de Sessões (Veterano de Guerra)', '100 Sessões Concluídas', 'Complete 100 sessões de estudo no total.', 'sessions_total', 'all', 100, 5000, 1000),
('main-sessions-4', 'main', 'Trilha de Sessões (Veterano de Guerra)', '250 Sessões Concluídas', 'Complete 250 sessões de estudo no total.', 'sessions_total', 'all', 250, 12000, 2500),
('main-sessions-5', 'main', 'Trilha de Sessões (Veterano de Guerra)', '500 Sessões Concluídas', 'Complete 500 sessões de estudo no total.', 'sessions_total', 'all', 500, 25000, 5000),
('main-sessions-6', 'main', 'Trilha de Sessões (Veterano de Guerra)', '1.000 Sessões Concluídas', 'Complete 1.000 sessões de estudo no total.', 'sessions_total', 'all', 1000, 60000, 12000),
('main-sessions-7', 'main', 'Trilha de Sessões (Veterano de Guerra)', '2.500 Sessões Concluídas', 'Complete 2.500 sessões de estudo no total.', 'sessions_total', 'all', 2500, 150000, 30000),
('main-sessions-8', 'main', 'Trilha de Sessões (Veterano de Guerra)', '3.250 Sessões Concluídas', 'Complete 3.250 sessões de estudo no total.', 'sessions_total', 'all', 3250, 220000, 45000),
('main-sessions-9', 'main', 'Trilha de Sessões (Veterano de Guerra)', '4.000 Sessões Concluídas', 'Complete 4.000 sessões de estudo no total.', 'sessions_total', 'all', 4000, 300000, 60000),
('main-sessions-10', 'main', 'Trilha de Sessões (Veterano de Guerra)', '5.000 Sessões Concluídas', 'Complete 5.000 sessões de estudo no total.', 'sessions_total', 'all', 5000, 400000, 80000),
('main-forge-1', 'main', 'Trilha da Forja (Poder Implacável)', 'Primeira Peça', 'Adquira e equipe seu primeiro item Nível 10.', 'forge', 'all', 1, 500, 0),
('main-forge-2', 'main', 'Trilha da Forja (Poder Implacável)', 'Set de Cobre', 'Equipe um item Nível 10 em todos os 4 slots.', 'forge', 'all', 1, 2000, 500),
('main-forge-3', 'main', 'Trilha da Forja (Poder Implacável)', 'O Início da Forja', 'Alcance o refino +12 em um equipamento Nível 10.', 'forge', 'all', 1, 5000, 1000),
('main-forge-4', 'main', 'Trilha da Forja (Poder Implacável)', 'Arsenal de Ferro', 'Equipe seu primeiro item Nível 50.', 'forge', 'all', 1, 10000, 2000),
('main-forge-5', 'main', 'Trilha da Forja (Poder Implacável)', 'Set de Ferro', 'Equipe um item Nível 50 em todos os 4 slots.', 'forge', 'all', 1, 25000, 5000),
('main-forge-6', 'main', 'Trilha da Forja (Poder Implacável)', 'Mestre Ferreiro', 'Alcance o refino +12 em um equipamento Nível 50.', 'forge', 'all', 1, 45000, 9000),
('main-forge-7', 'main', 'Trilha da Forja (Poder Implacável)', 'Relíquia Ancestral', 'Equipe seu primeiro item Nível 100.', 'forge', 'all', 1, 75000, 15000),
('main-forge-8', 'main', 'Trilha da Forja (Poder Implacável)', 'Armadura Divina', 'Equipe um item Nível 100 em todos os 4 slots.', 'forge', 'all', 1, 150000, 30000),
('main-forge-9', 'main', 'Trilha da Forja (Poder Implacável)', 'Forjado por Deuses', 'Alcance o refino máximo (+12) em um equipamento Nível 100.', 'forge', 'all', 1, 200000, 40000),
('main-forge-10', 'main', 'Trilha da Forja (Poder Implacável)', 'Avatar da Guerra', 'Tenha TODOS os 4 slots Nível 100 no refino máximo (+12).', 'forge', 'all', 1, 500000, 100000),
('main-economy-1', 'main', 'Trilha de Economia (O Tesouro do Dragão)', '1.000 de Ouro', 'Ganhe 1.000 de Ouro total na jornada.', 'gold_total', 'all', 1000, 1000, 200),
('main-economy-2', 'main', 'Trilha de Economia (O Tesouro do Dragão)', '10.000 de Ouro', 'Ganhe 10.000 de Ouro total na jornada.', 'gold_total', 'all', 10000, 5000, 1000),
('main-economy-3', 'main', 'Trilha de Economia (O Tesouro do Dragão)', '50.000 de Ouro', 'Ganhe 50.000 de Ouro total na jornada.', 'gold_total', 'all', 50000, 20000, 5000),
('main-economy-4', 'main', 'Trilha de Economia (O Tesouro do Dragão)', '100.000 de Ouro', 'Ganhe 100.000 de Ouro total na jornada.', 'gold_total', 'all', 100000, 45000, 9000),
('main-economy-5', 'main', 'Trilha de Economia (O Tesouro do Dragão)', '175.000 de Ouro', 'Ganhe 175.000 de Ouro total na jornada.', 'gold_total', 'all', 175000, 70000, 14000),
('main-economy-6', 'main', 'Trilha de Economia (O Tesouro do Dragão)', '250.000 de Ouro', 'Ganhe 250.000 de Ouro total na jornada.', 'gold_total', 'all', 250000, 100000, 20000);