-- ═══════════════════════════════════════════════════════════════════
-- Padronização "Matriz 3x4x4" de equipamentos.
--
-- Exatamente 1 nome Leve, 1 Médio e 1 Pesado para cada (Slot × Raridade):
--   4 slots (weapon, helmet, chest, boots) × 4 raridades × 3 classes = 48.
--
-- Cada classe mapeia para uma arte única no frontend, eliminando a
-- redundância de sinônimos que apontavam para a mesma imagem.
--   • Leve   (mágico)  -> _leve.webp
--   • Médio  (caçador) -> _medio.webp
--   • Pesado (soldado) -> _pesado.webp
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
  -- Arrays na ordem estrita: [Leve, Médio, Pesado].
  v_names := case
    when p_rarity = 'legendary' then
      case p_slot
        when 'weapon' then array['Cajado do Arquimestre', 'Arco Solar', 'Machado Ancestral']
        when 'helmet' then array['Coroa Eterna', 'Capuz Celestial', 'Elmo do Titã']
        when 'chest'  then array['Manto do Criador', 'Armadura Dracônica', 'Couraça do Titã']
        when 'boots'  then array['Passos da Eternidade', 'Botas Aladas', 'Grevas Sagradas']
        else array['Relíquia Lendária']
      end
    when p_rarity = 'epic' then
      case p_slot
        when 'weapon' then array['Cajado Arcano', 'Arco do Vento', 'Machado Rúnico']
        when 'helmet' then array['Coroa do Conhecimento', 'Capuz do Eclipse', 'Elmo Nobre']
        when 'chest'  then array['Manto do Mestre', 'Traje Furtivo', 'Armadura de Placas']
        when 'boots'  then array['Passos Arcanos', 'Botas Silenciosas', 'Grevas Fortificadas']
        else array['Relíquia Épica']
      end
    when p_rarity = 'rare' then
      case p_slot
        when 'weapon' then array['Cajado Elemental', 'Arco Curvo', 'Machado Reforçado']
        when 'helmet' then array['Coroa do Foco', 'Capuz das Sombras', 'Elmo Protetor']
        when 'chest'  then array['Túnica de Sabedoria', 'Colete Reforçado', 'Cota de Malha']
        when 'boots'  then array['Sapatos Místicos', 'Botas de Couro Macio', 'Botas Pesadas']
        else array['Relíquia Rara']
      end
    else
      case p_slot
        when 'weapon' then array['Cajado de Madeira', 'Arco Simples', 'Machado de Ferro']
        when 'helmet' then array['Capuz de Mago', 'Capuz de Couro', 'Elmo de Soldado']
        when 'chest'  then array['Túnica de Estudante', 'Armadura de Couro', 'Peitoral de Bronze']
        when 'boots'  then array['Sandálias de Pano', 'Botas de Caçador', 'Botas de Ferro']
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
-- Sanitização massiva dos dados legados.
--
-- Renomeia qualquer item fora do novo padrão de 48 nomes para o
-- equivalente da mesma raridade/slot, em inventory e nos 6 slots do
-- rotating_shop.
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  m record;
begin
  for m in
    select old_name, new_name from (values
      -- weapons
      ('Lâmina Ancestral'::text,        'Machado Ancestral'::text),
      ('Espada do Arquimestre'::text,   'Cajado do Arquimestre'::text),
      ('Lâmina Arcana'::text,           'Cajado Arcano'::text),
      ('Espada do Grão-Mestre'::text,   'Machado Rúnico'::text),
      ('Cimitarra do Foco'::text,       'Machado Reforçado'::text),
      ('Espada do Saber'::text,         'Machado Reforçado'::text),
      ('Lâmina de Estudo'::text,        'Machado de Ferro'::text),
      ('Adaga do Iniciante'::text,      'Machado de Ferro'::text),
      ('Machado de Guerra Rúnico'::text,'Machado Rúnico'::text),
      ('Machado de Ferro Reforçado'::text,'Machado Reforçado'::text),
      -- helmets
      ('Elmo do Primeiro Mestre'::text, 'Elmo do Titã'::text),
      ('Elmo do Guardião Eterno'::text, 'Elmo do Titã'::text),
      ('Elmo Arcano'::text,             'Elmo Nobre'::text),
      ('Elmo de Batalha Nobre'::text,   'Elmo Nobre'::text),
      ('Elmo do Estudioso'::text,       'Elmo Protetor'::text),
      ('Coifa de Saber'::text,          'Capuz de Mago'::text),
      ('Gorro do Aprendiz'::text,       'Capuz de Mago'::text),
      ('Capuz de Pano'::text,           'Capuz de Mago'::text),
      -- chests
      ('Armadura do Sábio Eterno'::text,'Couraça do Titã'::text),
      ('Armadura do Titã'::text,        'Couraça do Titã'::text),
      ('Armadura Arcanista'::text,      'Armadura de Placas'::text),
      ('Armadura de Placas Nobre'::text,'Armadura de Placas'::text),
      ('Túnica Arcana'::text,           'Manto do Mestre'::text),
      ('Peitoral de Estudo'::text,      'Cota de Malha'::text),
      ('Túnica de Algodão'::text,       'Túnica de Estudante'::text),
      ('Manto Simples'::text,           'Túnica de Estudante'::text),
      -- boots
      ('Grevas Lendárias'::text,        'Grevas Sagradas'::text),
      ('Botas do Andarilho Eterno'::text,'Passos da Eternidade'::text),
      ('Botas Arcanas'::text,           'Passos Arcanos'::text),
      ('Botas Fortificadas'::text,      'Grevas Fortificadas'::text),
      ('Grevas do Guardião'::text,      'Grevas Fortificadas'::text),
      ('Grevas do Aprendizado'::text,   'Botas Pesadas'::text),
      ('Botas do Peregrino'::text,      'Botas de Couro Macio'::text),
      ('Botas Simples'::text,           'Sandálias de Pano'::text),
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
