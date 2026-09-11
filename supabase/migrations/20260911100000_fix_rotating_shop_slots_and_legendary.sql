-- ═══════════════════════════════════════════════════════════════════
-- Correção do Mercado Rotativo:
--   • slots 1-4 com categoria fixa (Elmo, Arma, Peitoral, Bota)
--   • slot 5 = Curinga (categoria aleatória)
--   • slot 6 = Vitrine Especial (qualquer categoria, Épico ou Lendário)
--   • item_level restrito a 3 tiers do bracket do jogador
--     (abaixo/atual/acima do piso do nível, ex.: nível 43 -> 30/40/50)
--   • sem itens idênticos no mesmo lote sempre que houver opção no catálogo
-- ═══════════════════════════════════════════════════════════════════

-- gear_name ganha raridade 'legendary' (Vitrine Especial) e suporte à
-- exclusão de nomes já usados no lote para evitar duplicados idênticos.
-- Chama-se com 2 args (p_exclude vazio) mantém o comportamento anterior.
create or replace function public.gear_name(p_slot text, p_rarity text, p_exclude text[] default '{}')
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_names       text[];
  v_candidates  text[];
begin
  v_names := case
    when p_rarity = 'legendary' then
      case p_slot
        when 'weapon' then array['Lâmina Ancestral', 'Espada do Arquimestre']
        when 'helmet' then array['Elmo do Primeiro Mestre', 'Coroa Eterna']
        when 'chest' then array['Manto do Criador', 'Armadura do Sábio Eterno']
        when 'boots' then array['Grevas Lendárias', 'Botas do Andarilho Eterno']
        else array['Relíquia Lendária']
      end
    when p_rarity = 'epic' then
      case p_slot
        when 'weapon' then array['Lâmina Arcana', 'Espada do Grão-Mestre']
        when 'helmet' then array['Elmo Arcano', 'Coroa do Conhecimento']
        when 'chest' then array['Armadura Arcanista', 'Manto do Mestre']
        when 'boots' then array['Botas Arcanas', 'Grevas do Guardião']
        else array['Relíquia Épica']
      end
    when p_rarity = 'rare' then
      case p_slot
        when 'weapon' then array['Cimitarra do Foco', 'Espada do Saber']
        when 'helmet' then array['Elmo do Estudioso', 'Coroa do Foco']
        when 'chest' then array['Peitoral de Estudo', 'Túnica de Sabedoria']
        when 'boots' then array['Grevas do Aprendizado', 'Botas do Peregrino']
        else array['Relíquia Rara']
      end
    else
      case p_slot
        when 'weapon' then array['Lâmina de Estudo', 'Adaga do Iniciante']
        when 'helmet' then array['Coifa de Saber', 'Gorro do Aprendiz']
        when 'chest' then array['Túnica de Algodão', 'Manto Simples']
        when 'boots' then array['Sandálias do Caminho', 'Botas Simples']
        else array['Relíquia Comum']
      end
  end;

  -- tenta um nome ainda não usado no lote; catálogo esgotado => repete
  if p_exclude is not null and cardinality(p_exclude) > 0 then
    select array_agg(x) into v_candidates
    from unnest(v_names) as x
    where x <> all(p_exclude);
    if v_candidates is not null and cardinality(v_candidates) > 0 then
      return v_candidates[1 + floor(random() * cardinality(v_candidates))];
    end if;
  end if;

  return v_names[1 + floor(random() * array_length(v_names, 1))];
end;
$$;

-- substitui a versão antiga de 2 args por essa (com default no 3º)
drop function if exists public.gear_name(text, text);

revoke all on function public.gear_name(text, text, text[]) from public;
grant execute on function public.gear_name(text, text, text[]) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- refresh_shop(p_player_level)
--
-- Regras de negócio:
--   • baseTier = floor(p_player_level / 10) * 10
--   • item_level sorteado entre {baseTier-10 (>=10), baseTier, baseTier+10} (máx. 100)
--   • Slots 1-4: categoria fixa (Elmo, Arma, Peitoral, Bota)
--   • Slot 5: Curinga — qualquer categoria
--   • Slot 6: Vitrine — qualquer categoria, raridade Épico ou Lendário
--   • Slots 1-5: raridade ponderada (common 50% / rare 35% / epic 15%)
--   • Nomes sem duplicata no mesmo lote (sempre que houver opção no catálogo)
--   • Preço = baseCost(slot) × rarityMult × tierMult
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
  v_shop         public.rotating_shop%rowtype;
  v_slot         int;
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

  -- 3 tiers do bracket: abaixo/atual/acima do piso do nível do jogador.
  -- Ex.: nível 43 -> {30, 40, 50}. Tiers fora de [10, 100] são descartados.
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

  -- gera os 6 slots
  for v_slot in 1..6 loop
    -- raridade: slots 1-5 ponderada; slot 6 (Vitrine) Épico ou Lendário
    v_rarity := case
      when v_slot = 6 then case when random() < 0.5 then 'epic' else 'legendary' end
      else public.rarity_for_slot()
    end;

    -- categoria: 1 Elmo, 2 Arma, 3 Peitoral, 4 Bota; 5 Curinga; 6 Vitrine
    if v_slot <= 4 then
      v_cat := (array['helmet', 'weapon', 'chest', 'boots'])[v_slot];
    else
      v_cat := public.random_slot_category();
    end if;

    -- nível dentro do bracket
    v_level := v_tier_options[public.random_int(1, cardinality(v_tier_options))];

    -- nome sem duplicata no lote (sempre que houver opção no catálogo)
    v_name := public.gear_name(v_cat, v_rarity, v_used_names);
    v_used_names := v_used_names || v_name;

    -- stats
    v_atk := case when v_cat = 'weapon' then v_level * 2 else 0 end;
    v_def := case when v_cat in ('helmet','boots') then v_level else 0 end;
    v_hp  := case when v_cat = 'chest' then v_level * 10 else 0 end;

    -- preço: base × rarity × tier
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
      v_slot, v_slot, v_slot, v_slot,
      v_slot, v_slot, v_slot, v_slot, v_slot
    ) using v_rarity, v_cat, v_level, v_name, v_atk, v_def, v_hp, v_price, v_user;

    -- acumula para retorno
    v_slots := v_slots || jsonb_build_object(
      'slot', v_slot,
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