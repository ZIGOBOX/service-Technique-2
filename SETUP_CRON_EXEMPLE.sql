-- EXEMPLE OPTIONNEL : nécessite les extensions pg_cron et pg_net activées.
-- Remplacez VOTRE_CRON_SECRET avant exécution.

select cron.schedule(
  'pilotage-service-technique-automatic-report',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://sbkshssohbdqximhmpnj.supabase.co/functions/v1/automatic-report',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-cron-secret','VOTRE_CRON_SECRET'
    ),
    body := '{"mode":"scheduled"}'::jsonb
  );
  $$
);
