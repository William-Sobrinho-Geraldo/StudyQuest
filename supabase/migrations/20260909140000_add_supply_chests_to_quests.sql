-- Baús de Suprimentos vinculados a missões específicas.
-- reward_chest_tier: 'common' | 'rare' | 'epic' | null (missões que dão apenas Gold/XP).

alter table public.quests
  add column reward_chest_tier text;

alter table public.quests
  add constraint quests_reward_chest_tier_check
  check (reward_chest_tier in ('common', 'rare', 'epic') or reward_chest_tier is null);

comment on column public.quests.reward_chest_tier is
  'Raridade do baú de suprimentos concedido ao reivindicar. Null = sem baú (apenas Gold/XP).';

-- Popula as missões existentes que passam a conceder baús.
update public.quests
set reward_chest_tier = 'rare'
where id = 'weekly-2';

update public.quests
set reward_chest_tier = 'common'
where id = 'weekly-3';

update public.quests
set reward_chest_tier = 'common'
where id = 'main-time-3';

update public.quests
set reward_chest_tier = 'rare'
where id = 'main-time-5';

update public.quests
set reward_chest_tier = 'epic'
where id = 'main-time-8';

-- Reexpõe reward_chest_tier na função consumida pelo front (quest_progress()).
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
  reward_chest_tier text,
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
         q.reward_xp, q.reward_gold, q.reward_chest_tier, q.enabled,
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