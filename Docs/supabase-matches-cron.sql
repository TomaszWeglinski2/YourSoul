-- ============================================================
-- Your Soul — harmonogram dopasowań (pg_cron)
-- Uruchom OSOBNO, po supabase-matches.sql
-- ============================================================
--
-- KROK 1 — włącz pg_cron w Supabase:
--   Dashboard → Database → Extensions → szukaj „pg_cron” → Enable
--
-- KROK 2 — uruchom poniższe w SQL Editor (Run):
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Usuń stary job jeśli istnieje (bezpieczne przy ponownym uruchomieniu)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'your-soul-daily-matches';

-- Raz na dobę o 03:00 UTC — top 10 dopasowań, bez filtra geograficznego
SELECT cron.schedule(
  'your-soul-daily-matches',
  '0 3 * * *',
  $$ SELECT public.compute_daily_matches(10, NULL); $$
);

-- KROK 3 — sprawdź, czy job się zapisał:
-- SELECT jobid, jobname, schedule, command FROM cron.job;

-- KROK 4 (opcjonalnie) — ręczne przeliczenie od razu, bez czekania na cron:
-- SELECT public.compute_daily_matches(10, NULL);

-- Wyłączenie harmonogramu (gdybyś chciał):
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'your-soul-daily-matches';
