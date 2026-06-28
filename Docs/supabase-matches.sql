-- ============================================================
-- Your Soul — dopasowanie ludzi (matches + pgvector + cron)
-- Uruchom w Supabase SQL Editor po supabase-schema-align.sql
--
-- PRZED URUCHOMIENIEM (Supabase Dashboard):
--   1. Database → Extensions → włącz „vector” (pgvector)
--   2. Database → Extensions → włącz „pg_cron” (osobno, patrz supabase-matches-cron.sql)
--   3. Potem uruchom TEN plik w SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- Jeśli odcisk przypadkiem ma typ vector zamiast tablicy — napraw (aplikacja zapisuje double precision[])
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns c
    JOIN pg_type t ON t.typname = c.udt_name
    WHERE c.table_schema = 'public'
      AND c.table_name = 'profiles'
      AND c.column_name = 'odcisk'
      AND t.typname = 'vector'
  ) THEN
    ALTER TABLE public.profiles
      ALTER COLUMN odcisk TYPE double precision[]
      USING regexp_split_to_array(
        trim(both '[]' from odcisk::text),
        '\s*,\s*'
      )::double precision[];
  END IF;
END $$;

-- ------------------------------------------------------------
-- 1. Wektor odcisku na profiles (warstwa 1)
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS odcisk_vec vector(5);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text;

CREATE OR REPLACE FUNCTION public.odcisk_array_to_vector(arr double precision[])
RETURNS vector(5)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ('[' || array_to_string(arr, ',') || ']')::vector(5);
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_odcisk_vec()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.odcisk IS NOT NULL
     AND array_length(NEW.odcisk::double precision[], 1) = 5 THEN
    NEW.odcisk_vec := public.odcisk_array_to_vector(NEW.odcisk::double precision[]);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_odcisk_vec ON public.profiles;
CREATE TRIGGER profiles_sync_odcisk_vec
  BEFORE INSERT OR UPDATE OF odcisk ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_odcisk_vec();

UPDATE public.profiles AS p
SET odcisk_vec = public.odcisk_array_to_vector(p.odcisk::double precision[])
WHERE p.odcisk_vec IS NULL
  AND p.odcisk IS NOT NULL
  AND array_length(p.odcisk::double precision[], 1) = 5;

-- Indeks pgvector — utwórz ręcznie gdy masz ≥20 profili z odciskiem:
-- CREATE INDEX idx_profiles_odcisk_vec ON public.profiles
--   USING ivfflat (odcisk_vec vector_l2_ops) WITH (lists = 16);

-- ------------------------------------------------------------
-- 2. Tabela matches + metryki precision@K
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.matches (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matched_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('like_me', 'different')),
  odcisk_distance double precision NOT NULL,
  idf_score double precision NOT NULL DEFAULT 0,
  combined_score double precision NOT NULL,
  rank smallint NOT NULL,
  match_batch_id uuid NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id <> matched_user_id),
  UNIQUE (user_id, matched_user_id, mode, match_batch_id)
);

CREATE TABLE IF NOT EXISTS public.match_metrics (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  match_batch_id uuid NOT NULL,
  k smallint NOT NULL DEFAULT 5,
  users_evaluated integer NOT NULL DEFAULT 0,
  hits integer NOT NULL DEFAULT 0,
  precision_at_k double precision NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_user_mode_batch
  ON public.matches(user_id, mode, match_batch_id, rank);

CREATE INDEX IF NOT EXISTS idx_match_metrics_batch
  ON public.match_metrics(match_batch_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "matches_select_own" ON public.matches;
CREATE POLICY "matches_select_own"
  ON public.matches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Metryki tylko przez service_role (panel admin w przyszłości)
DROP POLICY IF EXISTS "match_metrics_service" ON public.match_metrics;
-- brak polityki dla authenticated = brak dostępu z klienta

-- ------------------------------------------------------------
-- 3. Odciski użytkownika (collections + nici) do IDF
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_fingerprint_keys(p_user_id uuid)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT key ORDER BY key), ARRAY[]::text[])
  FROM (
    SELECT 'c:' || quote_id::text AS key
    FROM public.collections
    WHERE user_id = p_user_id
    UNION ALL
    SELECT 'n:' || type || ':' || LEAST(quote_a_id, quote_b_id)::text || ':' || GREATEST(quote_a_id, quote_b_id)::text
    FROM public.nici
    WHERE user_id = p_user_id
  ) t;
$$;

CREATE OR REPLACE FUNCTION public.idf_overlap_score(p_user_a uuid, p_user_b uuid)
RETURNS double precision
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users integer;
  keys_a text[];
  keys_b text[];
  key text;
  df integer;
  score double precision := 0;
BEGIN
  SELECT COUNT(*)::integer INTO total_users FROM public.profiles;
  IF total_users < 2 THEN
    RETURN 0;
  END IF;

  keys_a := public.user_fingerprint_keys(p_user_a);
  keys_b := public.user_fingerprint_keys(p_user_b);

  IF keys_a IS NULL OR keys_b IS NULL OR array_length(keys_a, 1) IS NULL THEN
    RETURN 0;
  END IF;

  FOREACH key IN ARRAY keys_a LOOP
    IF key = ANY (keys_b) THEN
      IF key LIKE 'c:%' THEN
        SELECT COUNT(DISTINCT user_id)::integer INTO df
        FROM public.collections
        WHERE quote_id = (split_part(key, ':', 2))::bigint;
      ELSE
        SELECT COUNT(DISTINCT user_id)::integer INTO df
        FROM public.nici
        WHERE type = split_part(key, ':', 2)
          AND LEAST(quote_a_id, quote_b_id) = (split_part(key, ':', 3))::bigint
          AND GREATEST(quote_a_id, quote_b_id) = (split_part(key, ':', 4))::bigint;
      END IF;

      df := GREATEST(df, 1);
      score := score + ln(total_users::double precision / df::double precision);
    END IF;
  END LOOP;

  RETURN score;
END;
$$;

-- ------------------------------------------------------------
-- 4. Dzienne przeliczenie dopasowań
-- p_region_filter: NULL = wyłączony filtr geograficzny
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_daily_matches(
  p_top_k integer DEFAULT 10,
  p_region_filter text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  batch uuid := gen_random_uuid();
  prev_batch uuid;
  rec record;
  dist_cap constant double precision := 5.0;
BEGIN
  SELECT m.match_batch_id INTO prev_batch
  FROM public.matches m
  ORDER BY m.computed_at DESC
  LIMIT 1;

  IF prev_batch IS NOT NULL THEN
    PERFORM public.compute_match_precision(prev_batch, 5);
  END IF;

  DELETE FROM public.matches
  WHERE match_batch_id IN (
    SELECT match_batch_id FROM public.matches
    GROUP BY match_batch_id
    HAVING MAX(computed_at) < now() - interval '14 days'
  );

  FOR rec IN
    SELECT id, odcisk_vec
    FROM public.profiles
    WHERE odcisk_vec IS NOT NULL
      AND odcisk_vec <> '[0,0,0,0,0]'::vector(5)
      AND (p_region_filter IS NULL OR region = p_region_filter)
  LOOP
    INSERT INTO public.matches (
      user_id, matched_user_id, mode,
      odcisk_distance, idf_score, combined_score, rank, match_batch_id
    )
    SELECT
      rec.id,
      scored.matched_user_id,
      'like_me',
      scored.odcisk_distance,
      scored.idf_score,
      scored.combined_like,
      scored.rn::smallint,
      batch
    FROM (
      SELECT
        p.id AS matched_user_id,
        (rec.odcisk_vec <-> p.odcisk_vec)::double precision AS odcisk_distance,
        public.idf_overlap_score(rec.id, p.id) AS idf_score,
        (1.0 / (1.0 + (rec.odcisk_vec <-> p.odcisk_vec))) * 0.55
          + public.idf_overlap_score(rec.id, p.id) * 0.45 AS combined_like,
        ROW_NUMBER() OVER (
          ORDER BY
            (1.0 / (1.0 + (rec.odcisk_vec <-> p.odcisk_vec))) * 0.55
              + public.idf_overlap_score(rec.id, p.id) * 0.45 DESC
        ) AS rn
      FROM public.profiles p
      WHERE p.id <> rec.id
        AND p.odcisk_vec IS NOT NULL
        AND p.odcisk_vec <> '[0,0,0,0,0]'::vector(5)
        AND (p_region_filter IS NULL OR p.region = p_region_filter)
    ) scored
    WHERE scored.rn <= p_top_k;

    INSERT INTO public.matches (
      user_id, matched_user_id, mode,
      odcisk_distance, idf_score, combined_score, rank, match_batch_id
    )
    SELECT
      rec.id,
      scored.matched_user_id,
      'different',
      scored.odcisk_distance,
      scored.idf_score,
      scored.combined_diff,
      scored.rn::smallint,
      batch
    FROM (
      SELECT
        p.id AS matched_user_id,
        (rec.odcisk_vec <-> p.odcisk_vec)::double precision AS odcisk_distance,
        public.idf_overlap_score(rec.id, p.id) AS idf_score,
        ((rec.odcisk_vec <-> p.odcisk_vec) / dist_cap) * 0.7
          + public.idf_overlap_score(rec.id, p.id) * 0.15 AS combined_diff,
        ROW_NUMBER() OVER (
          ORDER BY
            ((rec.odcisk_vec <-> p.odcisk_vec) / dist_cap) * 0.7
              + public.idf_overlap_score(rec.id, p.id) * 0.15 DESC
        ) AS rn
      FROM public.profiles p
      WHERE p.id <> rec.id
        AND p.odcisk_vec IS NOT NULL
        AND p.odcisk_vec <> '[0,0,0,0,0]'::vector(5)
        AND (p_region_filter IS NULL OR p.region = p_region_filter)
    ) scored
    WHERE scored.rn <= p_top_k;
  END LOOP;

  RETURN batch;
END;
$$;

-- Karty dopasowań dla zalogowanego użytkownika (anonimowo, z publicznym marginesem)
CREATE OR REPLACE FUNCTION public.get_my_match_cards(p_mode text DEFAULT 'like_me')
RETURNS TABLE (
  match_id bigint,
  matched_user_id uuid,
  rank smallint,
  odcisk_distance double precision,
  idf_score double precision,
  combined_score double precision,
  matched_odcisk double precision[],
  public_margin_id bigint,
  public_margin_body text,
  public_margin_quote_id bigint,
  computed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  batch uuid;
BEGIN
  IF uid IS NULL OR p_mode NOT IN ('like_me', 'different') THEN
    RETURN;
  END IF;

  SELECT m.match_batch_id INTO batch
  FROM public.matches m
  WHERE m.user_id = uid
  ORDER BY m.computed_at DESC
  LIMIT 1;

  IF batch IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.matched_user_id,
    m.rank,
    m.odcisk_distance,
    m.idf_score,
    m.combined_score,
    p.odcisk,
    mg.id,
    mg.body,
    mg.quote_id,
    m.computed_at
  FROM public.matches m
  JOIN public.profiles p ON p.id = m.matched_user_id
  LEFT JOIN LATERAL (
    SELECT id, body, quote_id
    FROM public.margins
    WHERE user_id = m.matched_user_id AND visibility = 'public'
    ORDER BY created_at DESC
    LIMIT 1
  ) mg ON true
  WHERE m.user_id = uid
    AND m.match_batch_id = batch
    AND m.mode = p_mode
  ORDER BY m.rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_match_cards(text) TO authenticated;

-- precision@K: rezonans = margin_reaction na publicznym marginesie dopasowanego
CREATE OR REPLACE FUNCTION public.compute_match_precision(
  p_batch_id uuid,
  p_k integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users integer := 0;
  total_hits integer := 0;
  prec double precision := 0;
  u record;
  user_hits integer;
BEGIN
  FOR u IN
    SELECT DISTINCT user_id FROM public.matches WHERE match_batch_id = p_batch_id
  LOOP
    total_users := total_users + 1;

    SELECT COUNT(DISTINCT m.matched_user_id)::integer INTO user_hits
    FROM public.matches m
    WHERE m.match_batch_id = p_batch_id
      AND m.user_id = u.user_id
      AND m.mode = 'like_me'
      AND m.rank <= p_k
      AND EXISTS (
        SELECT 1
        FROM public.margins mg
        JOIN public.margin_reactions mr ON mr.margin_id = mg.id
        WHERE mg.user_id = m.matched_user_id
          AND mg.visibility = 'public'
          AND mr.user_id = m.user_id
      );

    total_hits := total_hits + user_hits;
  END LOOP;

  IF total_users > 0 THEN
    prec := (total_hits::double precision) / (total_users * p_k);
  END IF;

  INSERT INTO public.match_metrics (match_batch_id, k, users_evaluated, hits, precision_at_k)
  VALUES (p_batch_id, p_k, total_users, total_hits, prec);
END;
$$;

-- Cron — osobny plik: Docs/supabase-matches-cron.sql
-- (uruchom PO tym pliku, gdy pg_cron jest włączony)

NOTIFY pgrst, 'reload schema';
