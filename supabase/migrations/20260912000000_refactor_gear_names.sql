-- ═══════════════════════════════════════════════════════════════════
-- Refatoração dos nomes de equipamentos (Arquitetura Limpa).
--
-- Os nomes deixam de ser "genéricos" e passam a codificar a classe da
-- arte visual (leve/médio/pesado), removendo a inferência frágil por
-- substring no frontend. O frontend passa a usar um mapeamento estrito
-- (nome exato -> asset) em src/utils/itemVisuals.ts.
--
--   • leve   (mágico): Cajado, Capuz, Manto, Túnica
--   • médio  (caçador): Arco, Couro
--   • pesado (soldado): Machado, Elmo, Malha, Ferro
-- ═══════════════════════════════════════════════════════════════════

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
        when 'weapon' then array['Machado Ancestral', 'Cajado do Arquimestre', 'Arco Solar']
        when 'helmet' then array['Elmo do Guardião Eterno', 'Capuz Celestial']
        when 'chest'  then array['Armadura do Titã', 'Manto do Criador']
        when 'boots'  then array['Grevas Sagradas', 'Passos da Eternidade']
        else array['Relíquia Lendária']
      end
    when p_rarity = 'epic' then
      case p_slot
        when 'weapon' then array['Machado de Guerra Rúnico', 'Cajado Arcano', 'Arco do Vento']
        when 'helmet' then array['Elmo de Batalha Nobre', 'Capuz do Eclipse']
        when 'chest'  then array['Armadura de Placas Nobre', 'Túnica Arcana']
        when 'boots'  then array['Botas Fortificadas', 'Botas Arcanas']
        else array['Relíquia Épica']
      end
    when p_rarity = 'rare' then
      case p_slot
        when 'weapon' then array['Machado de Ferro Reforçado', 'Cajado Elemental', 'Arco Curvo']
        when 'helmet' then array['Elmo Protetor', 'Capuz das Sombras']
        when 'chest'  then array['Cota de Malha', 'Colete Reforçado']
        when 'boots'  then array['Botas Pesadas', 'Botas de Couro Macio']
        else array['Relíquia Rara']
      end
    else
      case p_slot
        when 'weapon' then array['Machado de Ferro', 'Cajado de Madeira', 'Arco Simples']
        when 'helmet' then array['Elmo de Soldado', 'Capuz de Mago', 'Capuz de Pano']
        when 'chest'  then array['Armadura de Couro', 'Manto Simples', 'Túnica de Estudante']
        when 'boots'  then array['Botas Simples', 'Sandálias de Pano', 'Botas de Caçador']
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

revoke all on function public.gear_name(text, text, text[]) from public;
grant execute on function public.gear_name(text, text, text[]) to service_role;

-- ═══════════════════════════════════════════════════════════════════
-- Sanitização dos dados legados.
--
-- Renomeia os itens antigos (inventory + slots do rotating_shop) para as
-- novas nomenclaturas, preservando a classe visual equivalente.
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  m record;
begin
  for m in
    select old_name, new_name from (values
      -- legendary
      ('Lâmina Ancestral'::text,        'Machado Ancestral'::text),
      ('Espada do Arquimestre'::text,   'Cajado do Arquimestre'::text),
      ('Elmo do Primeiro Mestre'::text, 'Elmo do Guardião Eterno'::text),
      ('Coroa Eterna'::text,            'Capuz Celestial'::text),
      ('Armadura do Sábio Eterno'::text,'Armadura do Titã'::text),
      ('Grevas Lendárias'::text,        'Grevas Sagradas'::text),
      ('Botas do Andarilho Eterno'::text,'Passos da Eternidade'::text),
      -- epic
      ('Lâmina Arcana'::text,           'Cajado Arcano'::text),
      ('Espada do Grão-Mestre'::text,   'Machado de Guerra Rúnico'::text),
      ('Elmo Arcano'::text,             'Elmo de Batalha Nobre'::text),
      ('Coroa do Conhecimento'::text,   'Capuz do Eclipse'::text),
      ('Armadura Arcanista'::text,      'Armadura de Placas Nobre'::text),
      ('Manto do Mestre'::text,         'Túnica Arcana'::text),
      ('Grevas do Guardião'::text,      'Botas Fortificadas'::text),
      -- rare
      ('Cimitarra do Foco'::text,       'Cajado Elemental'::text),
      ('Espada do Saber'::text,         'Machado de Ferro Reforçado'::text),
      ('Elmo do Estudioso'::text,       'Elmo Protetor'::text),
      ('Coroa do Foco'::text,           'Capuz de Mago'::text),
      ('Peitoral de Estudo'::text,      'Cota de Malha'::text),
      ('Túnica de Sabedoria'::text,     'Colete Reforçado'::text),
      ('Grevas do Aprendizado'::text,   'Botas Pesadas'::text),
      ('Botas do Peregrino'::text,      'Botas de Couro Macio'::text),
      -- common
      ('Lâmina de Estudo'::text,        'Machado de Ferro'::text),
      ('Adaga do Iniciante'::text,      'Cajado de Madeira'::text),
      ('Coifa de Saber'::text,          'Capuz de Pano'::text),
      ('Gorro do Aprendiz'::text,       'Capuz de Mago'::text),
      ('Túnica de Algodão'::text,       'Túnica de Estudante'::text),
      ('Sandálias do Caminho'::text,    'Sandálias de Pano'::text)
    ) as t(old_name, new_name)
  loop
    update public.inventory
       set name = m.new_name
     where name = m.old_name;

    update public.rotating_shop set slot_1_name = m.new_name where slot_1_name = m.old_name;
    update public.rotating_shop set slot_2_name = m.new_name where slot_2_name = m.old_name;
    update public.rotating_shop set slot_3_name = m.new_name where slot_3_name = m.old_name;
    update public.rotating_shop set slot_4_name = m.new_name where slot_4_name = m.old_name;
    update public.rotating_shop set slot_5_name = m.new_name where slot_5_name = m.old_name;
    update public.rotating_shop set slot_6_name = m.new_name where slot_6_name = m.old_name;
  end loop;
end;
$$;
