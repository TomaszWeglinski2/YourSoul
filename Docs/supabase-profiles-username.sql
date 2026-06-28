-- ============================================================
-- Your Soul — nazwa podróżnika (display_name)
-- Uruchom w Supabase SQL Editor po supabase-auth-rls.sql
-- ============================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_display_name_lower
  ON public.profiles (lower(trim(display_name)))
  WHERE display_name IS NOT NULL AND length(trim(display_name)) > 0;

CREATE OR REPLACE FUNCTION public.normalize_display_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(trim(regexp_replace(trim(p_name), '\s+', ' ', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.set_my_display_name(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nie jesteś zalogowany.';
  END IF;

  normalized := public.normalize_display_name(p_name);

  IF normalized IS NULL OR length(normalized) < 3 THEN
    RAISE EXCEPTION 'Nazwa musi mieć co najmniej 3 znaki.';
  END IF;

  IF length(normalized) > 24 THEN
    RAISE EXCEPTION 'Nazwa może mieć maksymalnie 24 znaki.';
  END IF;

  IF normalized !~ '^[[:alnum:][:space:]_\-]+$' THEN
    RAISE EXCEPTION 'Dozwolone: litery, cyfry, spacja, _ i -.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id <> uid
      AND lower(trim(p.display_name)) = lower(normalized)
  ) THEN
    RAISE EXCEPTION 'Ta nazwa jest już zajęta.';
  END IF;

  UPDATE public.profiles
  SET display_name = normalized, updated_at = now()
  WHERE id = uid;

  RETURN normalized;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_my_display_name(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
