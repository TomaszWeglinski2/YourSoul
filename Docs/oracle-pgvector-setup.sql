-- Your Soul — pgvector + funkcja dopasowania dla /api/oracle
-- Uruchom w Supabase SQL Editor (jednorazowo)

CREATE EXTENSION IF NOT EXISTS vector;

-- Kolumna status (jeśli brak)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Zamiana axes na vector(5) — tylko jeśli masz jeszcze double precision[]
-- UWAGA: odkomentuj poniższe, gdy axes to tablica, nie vector:
-- ALTER TABLE public.quotes
--   ALTER COLUMN axes TYPE vector(5)
--   USING axes::vector(5);

CREATE OR REPLACE FUNCTION public.oracle_match_quote(
  target_axes vector(5),
  exclude_ids bigint[] DEFAULT ARRAY[]::bigint[]
)
RETURNS TABLE (
  id bigint,
  text text,
  author text,
  work text,
  axes vector(5),
  distance double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    q.id,
    q.text,
    q.author,
    q.work,
    q.axes,
    q.axes <-> target_axes AS distance
  FROM public.quotes q
  WHERE q.status = 'active'
    AND NOT (q.id = ANY (exclude_ids))
  ORDER BY q.axes <-> target_axes
  LIMIT 1;
$$;

NOTIFY pgrst, 'reload schema';
