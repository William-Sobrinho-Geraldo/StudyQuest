-- ============================================================
-- Agendamento do recálculo do Ranking Global via pg_cron.
-- Caminho principal: roda refresh_global_ranking() a cada 30
-- minutos. A primeira carga do cache já ocorreu na migration
-- anterior, então a leitura nunca fica vazia.
--
-- Plano B (se pg_cron não estiver disponível): o cache continua
-- funcional porque a RPC lê só a tabela; basta executar
-- `select public.refresh_global_ranking();` manualmente ou via
-- Edge Function agendada. (Trigger incremental seria contra-
-- produtivo aqui porque o ranking é um snapshot por janela fixa.)
-- ============================================================

create extension if not exists pg_cron with schema extensions;

do $do$
begin
  if exists (select 1 from cron.job where jobname = 'refresh-global-ranking') then
    perform cron.unschedule('refresh-global-ranking');
  end if;
  perform cron.schedule(
    'refresh-global-ranking',
    '*/30 * * * *',
    $$select public.refresh_global_ranking();$$
  );
end;
$do$;