-- Função RPC para verificar se um e-mail existe em auth.users, usada no fluxo
-- de recuperação de senha antes de disparar o resetPasswordForEmail.
--
-- SECURITY DEFINER: executa com os privilégios do owner (postgres), permitindo
-- consultar auth.users sem expor dados sigilosos; a função só retorna BOOLEAN.

create or replace function public.check_email_exists(email_input text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  return exists (
    select 1
    from auth.users
    where email = lower(email_input)
  );
end;
$$;

grant execute on function public.check_email_exists(text) to anon, authenticated;