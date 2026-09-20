-- ============================================================
-- Upload de Avatar (Fase 3): armazenamento + coluna avatar_url.
--   - avatar_url: URL pública do bucket 'avatars' no profiles.
--   - Bucket público 'avatars' com limite de 1 MB e tipos de
--     imagem restritos (jpeg/png/webp), alinhado à meta de
--     imagens leves.
--   - RLS: leitura pública do bucket; upload/update/delete
--     apenas do próprio usuário dentro da própria pasta.
-- ============================================================

-- 1) Coluna avatar_url na tabela profiles.
alter table public.profiles
  add column if not exists avatar_url text;

-- RLS profiles_update_own autoriza o dono a atualizar a linha;
-- estendemos o grant de coluna editável.
grant update (avatar_url) on public.profiles to authenticated;

-- ============================================================
-- 2) Bucket público 'avatars'.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do
  update set
    public = true,
    file_size_limit = 1048576,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- ============================================================
-- 3) Políticas RLS do bucket avatars.
-- ============================================================

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_own_insert" on storage.objects;
create policy "avatars_own_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);