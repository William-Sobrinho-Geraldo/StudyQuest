-- ═══════════════════════════════════════════════════════════════════
-- Mercado Rotativo: Slot 1 Especial + sorteio independente por slot.
--
-- Correção do bug de seed/randomização: as funções auxiliares antigas
-- (rarity_for_slot / random_int / random_slot_category) estavam marcadas
-- como IMMUTABLE, fazendo o Postgres avaliar random() uma única vez e
-- reutilizar o mesmo valor em múltiplos slots. A nova implementação
-- avalia random() isoladamente dentro de um loop FOR i IN 1..6.
--
-- Algoritmo por slot (i):
--   1) Raridade:
--        i = 1 (Especial) → Épico 85% | Lendário 15%
--        i > 1 (Gerais)   → Comum 50% | Raro 35% | Épico 12% | Lendário 3%
--   2) Categoria (20% cada): weapon | helmet | chest | boots | avatar
--   3) Validação de avatar (só existe Épico/Lendário):
--        avatar + common/rare       → equipamento aleatório
--        avatar + épico sem estoque → equipamento épico
--        avatar + lendário obtido   → equipamento lendário
--   4) Gera stats/preço e persiste no slot.
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.refresh_shop(p_player_level int)
returns table (
  slot int,
  rarity text,
  item_category text,
  item_level int,
  name text,
  attack int,
  defense int,
  hp int,
  price int,
  bought boolean,
  next_refresh_at timestamptz,
  refreshes_today int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user         uuid := auth.uid();
  v_base_tier    int;
  v_tier_options int[] := array[10]::int[];
  v_used_names   text[] := '{}'::text[];
  v_unlocked     text[] := '{}'::text[];
  v_epics        text[] := '{}'::text[];
  v_has_leg      boolean := false;
  v_shop         public.rotating_shop%rowtype;
  i              int;
  v_rarity       text;
  v_cat          text;
  v_level        int;
  v_name         text;
  v_atk          int;
  v_def          int;
  v_hp           int;
  v_price        int;
  v_r_mult       numeric;
  v_t_mult       numeric;
  v_next         timestamptz;
  v_slots        jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  -- avatares já desbloqueados pelo usuário
  select coalesce(p.unlocked_avatars, '{}'::text[]) into v_unlocked
  from public.profiles p
  where p.id = v_user;

  -- épicos ainda não obtidos + disponibilidade do lendário
  select array_agg(a.id order by a.id) into v_epics
  from (values ('epico_6'), ('epico_7'), ('epico_8')) as a(id)
  where a.id <> all(v_unlocked);
  v_epics := coalesce(v_epics, '{}'::text[]);
  v_has_leg := not ('lendario_1' = any(v_unlocked));

  -- 3 tiers do bracket: abaixo/atual/acima do piso do nível do jogador.
  v_base_tier := floor(p_player_level / 10.0) * 10;
  select array_agg(t.x order by t.x) into v_tier_options
    from unnest(array[v_base_tier - 10, v_base_tier, v_base_tier + 10]) as t(x)
    where t.x between 10 and 100;
  if v_tier_options is null or cardinality(v_tier_options) = 0 then
    v_tier_options := array[10]::int[];
  end if;

  -- garante existência da linha do shop
  insert into public.rotating_shop (user_id) values (v_user)
    on conflict (user_id) do nothing;

  select * into v_shop from public.rotating_shop where rotating_shop.user_id = v_user;

  v_next := now() + interval '24 hours';

  for i in 1..6 loop
    -- 1) raridade
    if i = 1 then
      v_rarity := case when random() < 0.15 then 'legendary' else 'epic' end;
    else
      v_rarity := case
        when random() < 0.50 then 'common'
        when random() < 0.85 then 'rare'
        when random() < 0.97 then 'epic'
        else 'legendary'
      end;
    end if;

    -- 2) categoria (20% cada)
    v_cat := (array['weapon','helmet','chest','boots','avatar'])[1 + floor(random() * 5)::int];

    -- 3) validação de avatar
    if v_cat = 'avatar' then
      if v_rarity in ('common', 'rare') then
        v_cat := (array['weapon','helmet','chest','boots'])[1 + floor(random() * 4)::int];
      elsif v_rarity = 'epic' then
        if cardinality(v_epics) = 0 then
          v_cat := (array['weapon','helmet','chest','boots'])[1 + floor(random() * 4)::int];
        else
          v_name := v_epics[1 + floor(random() * cardinality(v_epics))::int];
        end if;
      else
        if not v_has_leg then
          v_cat := (array['weapon','helmet','chest','boots'])[1 + floor(random() * 4)::int];
        else
          v_name := 'lendario_1';
        end if;
      end if;
    end if;

    -- 4) geração do item
    if v_cat = 'avatar' then
      v_level := 0;
      v_atk   := 0;
      v_def   := 0;
      v_hp    := 0;
      v_price := public.avatar_shop_price(v_rarity);
    else
      v_level := v_tier_options[1 + floor(random() * cardinality(v_tier_options))::int];
      v_name  := public.gear_name(v_cat, v_rarity, v_used_names);
      v_used_names := v_used_names || v_name;

      v_atk := case when v_cat = 'weapon' then v_level * 2 else 0 end;
      v_def := case when v_cat in ('helmet','boots') then v_level else 0 end;
      v_hp  := case when v_cat = 'chest' then v_level * 10 else 0 end;

      v_r_mult := case v_rarity
        when 'common'    then 1.0
        when 'rare'      then 1.8
        when 'epic'      then 3.0
        when 'legendary' then 5.0
        else 1.0
      end;
      v_t_mult := 1.0 + (v_level / 10.0 - 1) * 0.5;

      v_price := case v_cat
        when 'weapon' then 80
        when 'helmet' then 50
        when 'chest'  then 120
        when 'boots'  then 50
      end;
      v_price := round(v_price * v_r_mult * v_t_mult)::int;
    end if;

    -- persiste no slot correspondente
    execute format(
      'update public.rotating_shop
         set slot_%s_rarity   = $1,
             slot_%s_category = $2,
             slot_%s_level    = $3,
             slot_%s_name     = $4,
             slot_%s_attack   = $5,
             slot_%s_defense  = $6,
             slot_%s_hp       = $7,
             slot_%s_price    = $8,
             slot_%s_bought   = false
       where user_id = $9',
      i, i, i, i, i, i, i, i, i
    ) using v_rarity, v_cat, v_level, v_name, v_atk, v_def, v_hp, v_price, v_user;

    -- acumula para retorno
    v_slots := v_slots || jsonb_build_object(
      'slot', i,
      'rarity', v_rarity,
      'item_category', v_cat,
      'item_level', v_level,
      'name', v_name,
      'attack', v_atk,
      'defense', v_def,
      'hp', v_hp,
      'price', v_price,
      'bought', false
    );
  end loop;

  -- atualiza meta
  update public.rotating_shop as rs
    set next_refresh_at = v_next,
        refreshes_today = rs.refreshes_today + 1
    where rs.user_id = v_user;

  -- retorno: slots + meta
  return query
  select
    (elem->>'slot')::int,
    (elem->>'rarity')::text,
    (elem->>'item_category')::text,
    (elem->>'item_level')::int,
    (elem->>'name')::text,
    (elem->>'attack')::int,
    (elem->>'defense')::int,
    (elem->>'hp')::int,
    (elem->>'price')::int,
    (elem->>'bought')::boolean,
    v_next,
    (select rs2.refreshes_today from public.rotating_shop rs2 where rs2.user_id = v_user)
  from jsonb_array_elements(v_slots) elem;
end;
$$;

revoke all on function public.refresh_shop(int) from public;
grant execute on function public.refresh_shop(int) to authenticated;
grant execute on function public.refresh_shop(int) to service_role;
