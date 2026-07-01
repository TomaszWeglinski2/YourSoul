-- ============================================================
-- Your Soul — Pracownia (notes, user_quotes, public constellation)
-- Uruchom w Supabase SQL Editor po supabase-auth-rls.sql
-- i supabase-profiles-username.sql (display_name / nick)
-- ============================================================

-- Notatki własne (własne myśli gracza)
CREATE TABLE IF NOT EXISTS public.notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text,
  body text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared', 'public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Udostępnienia notatki konkretnym osobom (dla poziomu 'shared')
CREATE TABLE IF NOT EXISTS public.note_shares (
  note_id bigint NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (note_id, target_user_id)
);

-- Własne cytaty gracza — OSOBNA tabela, NIE public.quotes
CREATE TABLE IF NOT EXISTS public.user_quotes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  author text,
  source text,
  kind text NOT NULL DEFAULT 'found' CHECK (kind IN ('found', 'own')),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_public ON public.notes(user_id) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_note_shares_target ON public.note_shares(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotes_user_id ON public.user_quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotes_public ON public.user_quotes(user_id) WHERE visibility = 'public';

-- updated_at dla notes
CREATE OR REPLACE FUNCTION public.touch_notes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_touch_updated_at ON public.notes;
CREATE TRIGGER notes_touch_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_notes_updated_at();

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quotes ENABLE ROW LEVEL SECURITY;

-- notes: właściciel pełny dostęp; publiczne czyta każdy zalogowany; udostępnione czyta adresat
DROP POLICY IF EXISTS "notes_owner_all" ON public.notes;
CREATE POLICY "notes_owner_all" ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_select_public" ON public.notes;
CREATE POLICY "notes_select_public" ON public.notes FOR SELECT TO authenticated
  USING (visibility = 'public');

DROP POLICY IF EXISTS "notes_select_shared" ON public.notes;
CREATE POLICY "notes_select_shared" ON public.notes FOR SELECT TO authenticated
  USING (
    visibility = 'shared'
    AND EXISTS (
      SELECT 1 FROM public.note_shares s
      WHERE s.note_id = notes.id AND s.target_user_id = auth.uid()
    )
  );

-- note_shares: zarządza właściciel notatki; adresat widzi swoje
DROP POLICY IF EXISTS "note_shares_owner_all" ON public.note_shares;
CREATE POLICY "note_shares_owner_all" ON public.note_shares FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_shares.note_id AND n.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.id = note_shares.note_id AND n.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "note_shares_target_select" ON public.note_shares;
CREATE POLICY "note_shares_target_select" ON public.note_shares FOR SELECT TO authenticated
  USING (target_user_id = auth.uid());

-- user_quotes: właściciel pełny dostęp; publiczne czyta każdy zalogowany
DROP POLICY IF EXISTS "user_quotes_owner_all" ON public.user_quotes;
CREATE POLICY "user_quotes_owner_all" ON public.user_quotes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_quotes_select_public" ON public.user_quotes;
CREATE POLICY "user_quotes_select_public" ON public.user_quotes FOR SELECT TO authenticated
  USING (visibility = 'public');

-- ------------------------------------------------------------
-- RPC: wyszukiwanie nicków do udostępnienia (bez feedu, tylko lookup)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_traveler_nicks(p_query text, p_limit int DEFAULT 8)
RETURNS TABLE(user_id uuid, nick text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  q text := nullif(trim(p_query), '');
  lim int := greatest(1, least(coalesce(p_limit, 8), 20));
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nie jesteś zalogowany.';
  END IF;

  IF q IS NULL OR length(q) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.display_name
  FROM public.profiles p
  WHERE p.id <> uid
    AND p.display_name IS NOT NULL
    AND length(trim(p.display_name)) > 0
    AND p.display_name ILIKE '%' || q || '%'
  ORDER BY p.display_name
  LIMIT lim;
END;
$$;

-- ------------------------------------------------------------
-- RPC: nicki adresatów udostępnionej notatki (tylko właściciel)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_note_share_nicks(p_note_id bigint)
RETURNS TABLE(target_user_id uuid, nick text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nie jesteś zalogowany.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notes n
    WHERE n.id = p_note_id AND n.user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.target_user_id, p.display_name
  FROM public.note_shares s
  JOIN public.profiles p ON p.id = s.target_user_id
  WHERE s.note_id = p_note_id
    AND p.display_name IS NOT NULL;
END;
$$;

-- ------------------------------------------------------------
-- RPC: publiczna konstelacja nicku (tylko public, bez feedu)
-- Dostępna anon — odkrywalna na żądanie, nie strumień
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_constellation(p_nick text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
  normalized text := public.normalize_display_name(p_nick);
  result json;
BEGIN
  IF normalized IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT p.id INTO owner_id
  FROM public.profiles p
  WHERE lower(trim(p.display_name)) = lower(normalized)
  LIMIT 1;

  IF owner_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'nick', normalized,
    'notes', coalesce((
      SELECT json_agg(
        json_build_object(
          'id', n.id,
          'title', n.title,
          'body', n.body,
          'created_at', n.created_at,
          'updated_at', n.updated_at
        )
        ORDER BY n.updated_at DESC
      )
      FROM public.notes n
      WHERE n.user_id = owner_id AND n.visibility = 'public'
    ), '[]'::json),
    'user_quotes', coalesce((
      SELECT json_agg(
        json_build_object(
          'id', uq.id,
          'text', uq.text,
          'author', uq.author,
          'source', uq.source,
          'kind', uq.kind,
          'created_at', uq.created_at
        )
        ORDER BY uq.created_at DESC
      )
      FROM public.user_quotes uq
      WHERE uq.user_id = owner_id AND uq.visibility = 'public'
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_traveler_nicks(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_note_share_nicks(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_constellation(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
