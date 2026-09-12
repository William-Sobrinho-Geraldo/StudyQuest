-- ═══════════════════════════════════════════════════════════════════
-- Unicidade estrita de itens: 1 nome = 1 imagem.
--
-- A pasta public/assets/items tem exatamente 12 imagens
-- (4 slots × 3 classes: leve/médio/pesado). Portanto devem existir
-- exatamente 12 itens, cada um com um nome único que aponta para uma
-- imagem única. Nenhum sinônimo.
--
--   weapon: Cajado Arcano (leve) | Arco de Caça (médio) | Machado de Guerra (pesado)
--   helmet: Capuz de Mago (leve) | Capuz de Couro (médio) | Elmo de Aço (pesado)
--   chest:  Túnica Arcanista (leve) | Armadura de Couro (médio) | Armadura de Placas (pesado)
--   boots:  Sandálias Místicas (leve) | Botas de Couro (médio) | Botas de Ferro (pesado)
--
-- O nome passa a depender apenas do slot + classe (não da raridade);
-- a raridade continua sendo coluna própria (chip de cor).
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
  -- 3 nomes por slot, na ordem [Leve, Médio, Pesado]. p_rarity é mantido
  -- por compatibilidade de assinatura, mas não influencia mais o nome.
  v_names := case p_slot
    when 'weapon' then array['Cajado Arcano', 'Arco de Caça', 'Machado de Guerra']
    when 'helmet' then array['Capuz de Mago', 'Capuz de Couro', 'Elmo de Aço']
    when 'chest'  then array['Túnica Arcanista', 'Armadura de Couro', 'Armadura de Placas']
    when 'boots'  then array['Sandálias Místicas', 'Botas de Couro', 'Botas de Ferro']
    else array['Item Desconhecido']
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
-- Sanitização massiva: colapsa TODOS os nomes legados para os 12
-- canônicos, em inventory e nos 6 slots do rotating_shop.
-- ═══════════════════════════════════════════════════════════════════

do $$
declare
  m record;
begin
  for m in
    select old_name, new_name from (values
      -- weapons → Cajado Arcano (leve)
      ('Cajado de Madeira'::text,      'Cajado Arcano'::text),
      ('Cajado Elemental'::text,       'Cajado Arcano'::text),
      ('Cajado do Arquimestre'::text,  'Cajado Arcano'::text),
      -- weapons → Arco de Caça (médio)
      ('Arco Simples'::text,           'Arco de Caça'::text),
      ('Arco Curvo'::text,             'Arco de Caça'::text),
      ('Arco do Vento'::text,          'Arco de Caça'::text),
      ('Arco Solar'::text,             'Arco de Caça'::text),
      -- weapons → Machado de Guerra (pesado)
      ('Machado de Ferro'::text,       'Machado de Guerra'::text),
      ('Machado Reforçado'::text,      'Machado de Guerra'::text),
      ('Machado Rúnico'::text,         'Machado de Guerra'::text),
      ('Machado Ancestral'::text,      'Machado de Guerra'::text),
      ('Machado de Guerra Rúnico'::text,'Machado de Guerra'::text),
      ('Machado de Ferro Reforçado'::text,'Machado de Guerra'::text),
      ('Lâmina de Estudo'::text,       'Machado de Guerra'::text),
      ('Lâmina Arcana'::text,          'Machado de Guerra'::text),
      ('Lâmina Ancestral'::text,       'Machado de Guerra'::text),
      ('Adaga do Iniciante'::text,     'Machado de Guerra'::text),
      ('Espada do Saber'::text,        'Machado de Guerra'::text),
      ('Espada do Grão-Mestre'::text,  'Machado de Guerra'::text),
      ('Espada do Arquimestre'::text,  'Machado de Guerra'::text),
      ('Espada do Aprendiz'::text,     'Machado de Guerra'::text),
      ('Cimitarra do Foco'::text,      'Machado de Guerra'::text),
      -- helmets → Capuz de Mago (leve)
      ('Coroa do Foco'::text,          'Capuz de Mago'::text),
      ('Coroa do Conhecimento'::text,  'Capuz de Mago'::text),
      ('Coroa Eterna'::text,           'Capuz de Mago'::text),
      ('Coifa de Saber'::text,         'Capuz de Mago'::text),
      ('Gorro do Aprendiz'::text,      'Capuz de Mago'::text),
      ('Capuz de Pano'::text,          'Capuz de Mago'::text),
      -- helmets → Capuz de Couro (médio)
      ('Capuz das Sombras'::text,      'Capuz de Couro'::text),
      ('Capuz do Eclipse'::text,       'Capuz de Couro'::text),
      ('Capuz Celestial'::text,        'Capuz de Couro'::text),
      -- helmets → Elmo de Aço (pesado)
      ('Elmo de Soldado'::text,        'Elmo de Aço'::text),
      ('Elmo Protetor'::text,          'Elmo de Aço'::text),
      ('Elmo Nobre'::text,             'Elmo de Aço'::text),
      ('Elmo do Titã'::text,           'Elmo de Aço'::text),
      ('Elmo Arcano'::text,            'Elmo de Aço'::text),
      ('Elmo do Estudioso'::text,      'Elmo de Aço'::text),
      ('Elmo do Primeiro Mestre'::text,'Elmo de Aço'::text),
      ('Elmo do Guardião Eterno'::text,'Elmo de Aço'::text),
      ('Elmo de Batalha Nobre'::text,  'Elmo de Aço'::text),
      ('Elmo do Estudante'::text,      'Elmo de Aço'::text),
      -- chests → Túnica Arcanista (leve)
      ('Túnica de Estudante'::text,    'Túnica Arcanista'::text),
      ('Túnica de Sabedoria'::text,    'Túnica Arcanista'::text),
      ('Manto do Mestre'::text,        'Túnica Arcanista'::text),
      ('Manto do Criador'::text,       'Túnica Arcanista'::text),
      ('Manto Simples'::text,          'Túnica Arcanista'::text),
      ('Túnica de Algodão'::text,      'Túnica Arcanista'::text),
      ('Manto do Conhecimento'::text,  'Túnica Arcanista'::text),
      -- chests → Armadura de Couro (médio)
      ('Colete Reforçado'::text,       'Armadura de Couro'::text),
      ('Traje Furtivo'::text,          'Armadura de Couro'::text),
      ('Armadura Dracônica'::text,     'Armadura de Couro'::text),
      -- chests → Armadura de Placas (pesado)
      ('Peitoral de Bronze'::text,     'Armadura de Placas'::text),
      ('Cota de Malha'::text,          'Armadura de Placas'::text),
      ('Couraça do Titã'::text,        'Armadura de Placas'::text),
      ('Peitoral de Estudo'::text,     'Armadura de Placas'::text),
      ('Armadura Arcanista'::text,     'Armadura de Placas'::text),
      ('Armadura de Placas Nobre'::text,'Armadura de Placas'::text),
      ('Armadura do Titã'::text,       'Armadura de Placas'::text),
      ('Armadura do Sábio Eterno'::text,'Armadura de Placas'::text),
      ('Peitoral do Aprendiz'::text,   'Armadura de Placas'::text),
      -- boots → Sandálias Místicas (leve)
      ('Sandálias de Pano'::text,      'Sandálias Místicas'::text),
      ('Sapatos Místicos'::text,       'Sandálias Místicas'::text),
      ('Passos Arcanos'::text,         'Sandálias Místicas'::text),
      ('Passos da Eternidade'::text,   'Sandálias Místicas'::text),
      ('Sandálias do Caminho'::text,   'Sandálias Místicas'::text),
      -- boots → Botas de Couro (médio)
      ('Botas de Caçador'::text,       'Botas de Couro'::text),
      ('Botas de Couro Macio'::text,   'Botas de Couro'::text),
      ('Botas Silenciosas'::text,      'Botas de Couro'::text),
      ('Botas Aladas'::text,           'Botas de Couro'::text),
      ('Botas do Peregrino'::text,     'Botas de Couro'::text),
      ('Botas do Andarilho Eterno'::text,'Botas de Couro'::text),
      ('Botas Simples'::text,          'Botas de Couro'::text),
      -- boots → Botas de Ferro (pesado)
      ('Botas Pesadas'::text,          'Botas de Ferro'::text),
      ('Grevas Fortificadas'::text,    'Botas de Ferro'::text),
      ('Grevas Sagradas'::text,        'Botas de Ferro'::text),
      ('Grevas Lendárias'::text,       'Botas de Ferro'::text),
      ('Grevas do Aprendizado'::text,  'Botas de Ferro'::text),
      ('Grevas do Guardião'::text,     'Botas de Ferro'::text),
      ('Botas Fortificadas'::text,     'Botas de Ferro'::text)
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
