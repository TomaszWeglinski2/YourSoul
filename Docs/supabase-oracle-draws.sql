-- Dzienny limit losowań Wyroczni + snapshot Progu (od ostatniej wizyty).
-- Uruchom po supabase-auth-rls.sql.

CREATE TABLE IF NOT EXISTS public.oracle_draws (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  quote_id bigint REFERENCES public.quotes (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oracle_draws_user_day
  ON public.oracle_draws (user_id, created_at);

ALTER TABLE public.oracle_draws ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oracle_draws_own ON public.oracle_draws;
CREATE POLICY oracle_draws_own ON public.oracle_draws
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_threshold_visit_at timestamptz;

-- Początek „dzisiaj" w Europe/Warsaw jako timestamptz (UTC).
CREATE OR REPLACE FUNCTION public.warsaw_day_start(p_at timestamptz DEFAULT now())
RETURNS timestamptz
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT date_trunc('day', timezone('Europe/Warsaw', p_at)) AT TIME ZONE 'Europe/Warsaw';
$$;

CREATE OR REPLACE FUNCTION public.count_oracle_draws_today(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.oracle_draws d
  WHERE d.user_id = p_user_id
    AND d.created_at >= public.warsaw_day_start(now());
$$;

CREATE OR REPLACE FUNCTION public.get_oracle_draw_status(p_daily_limit integer DEFAULT 3)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  used bigint;
  lim integer := GREATEST(COALESCE(p_daily_limit, 3), 1);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie.';
  END IF;

  used := public.count_oracle_draws_today(uid);

  RETURN jsonb_build_object(
    'used_today', used,
    'daily_limit', lim,
    'remaining', GREATEST(lim - used, 0),
    'exhausted', used >= lim
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_oracle_draw(
  p_quote_id bigint,
  p_daily_limit integer DEFAULT 3
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  used bigint;
  lim integer := GREATEST(COALESCE(p_daily_limit, 3), 1);
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie.';
  END IF;

  used := public.count_oracle_draws_today(uid);

  IF used >= lim THEN
    RETURN jsonb_build_object(
      'ok', false,
      'used_today', used,
      'daily_limit', lim,
      'remaining', 0,
      'exhausted', true
    );
  END IF;

  INSERT INTO public.oracle_draws (user_id, quote_id)
  VALUES (uid, p_quote_id);

  used := used + 1;

  RETURN jsonb_build_object(
    'ok', true,
    'used_today', used,
    'daily_limit', lim,
    'remaining', GREATEST(lim - used, 0),
    'exhausted', used >= lim
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_threshold_since_last_visit()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  since timestamptz;
  resonances bigint;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie.';
  END IF;

  SELECT p.last_threshold_visit_at INTO since
  FROM public.profiles p
  WHERE p.id = uid;

  SELECT count(*)::bigint INTO resonances
  FROM public.margin_reactions mr
  JOIN public.margins m ON m.id = mr.margin_id
  WHERE m.user_id = uid
    AND m.visibility = 'public'
    AND mr.user_id <> uid
    AND mr.created_at > COALESCE(since, '-infinity'::timestamptz);

  RETURN jsonb_build_object(
    'new_resonances', resonances,
    'last_visit_at', since
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_threshold_visit()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  now_ts timestamptz := now();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie.';
  END IF;

  UPDATE public.profiles
  SET last_threshold_visit_at = now_ts
  WHERE id = uid;

  RETURN now_ts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_oracle_draw_status(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_oracle_draw(bigint, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_threshold_since_last_visit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_threshold_visit() TO authenticated;
