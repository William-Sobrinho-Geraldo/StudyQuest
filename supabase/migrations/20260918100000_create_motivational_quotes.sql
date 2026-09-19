-- ============================================================
-- Frases Motivacionais (arquitetura dinâmica via Supabase)
--   - Tabela motivational_quotes com categoria e autor.
--   - Coluna quote_preferences (text[]) em profiles.
--   - RPC get_random_quote_by_category retornando 1 frase
--     aleatória dentro das categorias escolhidas pelo usuário.
-- ============================================================

create table if not exists public.motivational_quotes (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  author text not null,
  category text not null
);

create index if not exists motivational_quotes_category_idx
  on public.motivational_quotes (category);

alter table public.motivational_quotes enable row level security;

-- Qualquer usuário autenticado pode ler as frases (a seleção por
-- categoria é feita de forma segura pela RPC security definer).
drop policy if exists motivational_quotes_select_all on public.motivational_quotes;
create policy motivational_quotes_select_all on public.motivational_quotes
  for select to authenticated
  using (true);

revoke all on table public.motivational_quotes from anon;
grant select on table public.motivational_quotes to authenticated, service_role;
grant insert, update, delete on table public.motivational_quotes to service_role;


-- ------------------------------------------------------------
-- Preferências de inspiração por usuário (categorias escolhidas).
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists quote_preferences text[] not null default '{}'::text[];

grant update (quote_preferences) on public.profiles to authenticated;


-- ------------------------------------------------------------
-- Normalização de categorias (case + acentos) para que as
-- preferências armazenadas e as frases no catálogo sempre casem,
-- ainda que sejam escritas de formas diferentes.
-- ------------------------------------------------------------
create or replace function public.fn_normalize_quote_category(p_value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select lower(translate(
    trim(p_value),
    'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇáàãâäéèêëíìîïóòõôöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc'
  ));
$$;

revoke all on function public.fn_normalize_quote_category(text) from public;
grant execute on function public.fn_normalize_quote_category(text) to authenticated;
grant execute on function public.fn_normalize_quote_category(text) to service_role;


-- ------------------------------------------------------------
-- RPC: retorna 1 frase aleatória que pertence a alguma das
-- categorias informadas. Se o array vier vazio, considera todas.
-- ------------------------------------------------------------
-- ATENÇÃO: depois de aplicar este SQL no banco remoto, se o
-- PostgREST ainda responder com PGRST202 ("function ... not found
-- in the schema cache"), recarregue o schema cache do Supabase no
-- painel (API Settings > "Reload Cache") ou via SQL:
--   notify pgrst, 'reload schema';
-- ------------------------------------------------------------
create or replace function public.get_random_quote_by_category(p_categories text[])
returns table (
  id uuid,
  content text,
  author text,
  category text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_categories text[];
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_categories := array(
    select public.fn_normalize_quote_category(value)
    from unnest(coalesce(p_categories, array[]::text[])) as t(value)
    where value is not null and trim(value) <> ''
  );

  if cardinality(v_categories) = 0 then
    v_categories := array(
      select distinct public.fn_normalize_quote_category(category)
      from public.motivational_quotes
    );
  end if;

  return query
    select q.id, q.content, q.author, q.category
    from public.motivational_quotes q
    where public.fn_normalize_quote_category(q.category) = any(v_categories)
    order by random()
    limit 1;
end;
$$;

revoke all on function public.get_random_quote_by_category(text[]) from public;
grant execute on function public.get_random_quote_by_category(text[]) to authenticated;
grant execute on function public.get_random_quote_by_category(text[]) to service_role;


-- ------------------------------------------------------------
-- Catálogo inicial de frases (5 categorias).
-- ------------------------------------------------------------
insert into public.motivational_quotes (id, content, author, category) values
  ('a0000000-0000-0000-0000-000000000001', 'Conheça o seu inimigo e conheça a si mesmo, e você vencerá mil batalhas.', 'Sun Tzu', 'Militar'),
  ('a0000000-0000-0000-0000-000000000002', 'A vitória pertence aos mais perseverantes.', 'Napoleão Bonaparte', 'Militar'),
  ('a0000000-0000-0000-0000-000000000003', 'A disciplina é a alma de um exército.', 'George Washington', 'Militar'),
  ('a0000000-0000-0000-0000-000000000004', 'Um exército de cervos liderado por um leão é mais temível do que um exército de leões liderado por um cervo.', 'Plutarco', 'Militar'),
  ('a0000000-0000-0000-0000-000000000005', 'Se você quer a paz, prepare-se para a guerra.', 'Vegetius', 'Militar'),
  ('a0000000-0000-0000-0000-000000000006', 'A tenacidade é o combustível da vitória nas batalhas da vida.', 'Anônimo', 'Militar'),
  ('a0000000-0000-0000-0000-000000000007', 'A imaginação é mais importante que o conhecimento.', 'Albert Einstein', 'Científica'),
  ('a0000000-0000-0000-0000-000000000008', 'Se enxerguei mais longe, foi por estar sobre os ombros de gigantes.', 'Isaac Newton', 'Científica'),
  ('a0000000-0000-0000-0000-000000000009', 'A dúvida é o princípio da sabedoria.', 'Aristóteles', 'Científica'),
  ('a0000000-0000-0000-0000-000000000010', 'A ciência sem consciência não passa de ruína da alma.', 'François Rabelais', 'Científica'),
  ('a0000000-0000-0000-0000-000000000011', 'O que sabemos é uma gota; o que ignoramos é um oceano.', 'Isaac Newton', 'Científica'),
  ('a0000000-0000-0000-0000-000000000012', 'Não há fatos eternos, como não há verdades absolutas.', 'Friedrich Nietzsche', 'Científica'),
  ('a0000000-0000-0000-0000-000000000013', 'Tudo posso naquele que me fortalece.', 'Filipenses 4:13', 'Religiosa'),
  ('a0000000-0000-0000-0000-000000000014', 'O Senhor é o meu pastor, nada me faltará.', 'Salmos 23:1', 'Religiosa'),
  ('a0000000-0000-0000-0000-000000000015', 'A fé é a certeza daquilo que esperamos e a prova das coisas que não vemos.', 'Hebreus 11:1', 'Religiosa'),
  ('a0000000-0000-0000-0000-000000000016', 'Entrega o teu caminho ao Senhor; confia nele, e ele tudo fará.', 'Salmos 37:5', 'Religiosa'),
  ('a0000000-0000-0000-0000-000000000017', 'Tudo tem o seu tempo determinado, e há tempo para todo propósito debaixo do céu.', 'Eclesiastes 3:1', 'Religiosa'),
  ('a0000000-0000-0000-0000-000000000018', 'Buscai primeiro o Reino de Deus e a sua justiça, e todas as outras coisas vos serão acrescentadas.', 'Mateus 6:33', 'Religiosa'),
  ('a0000000-0000-0000-0000-000000000019', 'Conhece-te a ti mesmo.', 'Sócrates', 'Filosófica'),
  ('a0000000-0000-0000-0000-000000000020', 'Só sei que nada sei.', 'Sócrates', 'Filosófica'),
  ('a0000000-0000-0000-0000-000000000021', 'A vida sem exame não vale a pena ser vivida.', 'Sócrates', 'Filosófica'),
  ('a0000000-0000-0000-0000-000000000022', 'Somos o que fazemos repetidamente; a excelência não é um hábito, mas um ato.', 'Aristóteles', 'Filosófica'),
  ('a0000000-0000-0000-0000-000000000023', 'O que não me destrói me fortalece.', 'Friedrich Nietzsche', 'Filosófica'),
  ('a0000000-0000-0000-0000-000000000024', 'Quem olha para fora sonha; quem olha para dentro desperta.', 'Carl Jung', 'Filosófica'),
  ('a0000000-0000-0000-0000-000000000025', 'O segredo de ir adiante é começar.', 'Mark Twain', 'Produtividade'),
  ('a0000000-0000-0000-0000-000000000026', 'A melhor maneira de prever o futuro é criá-lo.', 'Peter Drucker', 'Produtividade'),
  ('a0000000-0000-0000-0000-000000000027', 'Foco é a arte de dizer não.', 'Steve Jobs', 'Produtividade'),
  ('a0000000-0000-0000-0000-000000000028', 'Aja como se o que você faz fizesse a diferença, porque faz.', 'William James', 'Produtividade'),
  ('a0000000-0000-0000-0000-000000000029', 'Cada minuto gasto em planejamento economiza dez minutos de execução.', 'Brian Tracy', 'Produtividade'),
  ('a0000000-0000-0000-0000-000000000030', 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', 'Robert Collier', 'Produtividade')
on conflict (id) do nothing;