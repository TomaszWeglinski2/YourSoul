-- ============================================================
-- Your Soul — cron nocny dla systemu poleceń
-- Uruchom PO Docs/supabase-referrals.sql
-- Wymaga pg_cron (Database → Extensions → pg_cron)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'your-soul-nightly-referrals';

-- Codziennie o 04:00 UTC (po dopasowaniach o 03:00)
SELECT cron.schedule(
  'your-soul-nightly-referrals',
  '0 4 * * *',
  $$ SELECT public.compute_nightly_referrals(); $$
);

-- Ręcznie od razu:
-- SELECT public.compute_nightly_referrals();
