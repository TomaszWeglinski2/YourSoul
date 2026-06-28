-- ============================================================
-- Your Soul — wyrównanie schematu bazy do aplikacji
-- Uruchom JEDEN RAZ w Supabase SQL Editor (Production)
-- Naprawia: margins.text → body, nici bez quote_a_id, brakujące kolumny
-- ============================================================

-- 1. margins: wczesny schemat miał kolumnę "text", aplikacja używa "body"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'margins' AND column_name = 'text'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'margins' AND column_name = 'body'
  ) THEN
    ALTER TABLE public.margins RENAME COLUMN text TO body;
  END IF;
END $$;

ALTER TABLE public.margins ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.margins ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';
ALTER TABLE public.margins ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 2. profiles: kolumny z supabase-auth-rls.sql (jeśli brak)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS worlds text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS odcisk double precision[] NOT NULL DEFAULT '{0,0,0,0,0}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. quotes: kolumny z kroku konstelacji
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS cien text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS quality integer NOT NULL DEFAULT 0;

-- 4. nici: jeśli tabela istnieje ze złym schematem — usuń tylko gdy pusta
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'nici'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'nici' AND column_name = 'quote_a_id'
  ) THEN
    IF (SELECT COUNT(*) FROM public.nici) = 0 THEN
      DROP TABLE public.nici;
    ELSE
      RAISE EXCEPTION 'Tabela nici ma stary schemat i zawiera dane — napisz do dev przed migracją.';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.nici (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quote_a_id bigint NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  quote_b_id bigint NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('pokrewienstwo', 'napiecie')),
  glosa text NOT NULL,
  axis smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (quote_a_id <> quote_b_id)
);

CREATE TABLE IF NOT EXISTS public.quote_flags (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quote_id bigint NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_id)
);

CREATE INDEX IF NOT EXISTS idx_nici_user_id ON public.nici(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_flags_quote_id ON public.quote_flags(quote_id);

-- 5. RLS + polityki (bezpieczne — IF NOT EXISTS przez DROP/CREATE)
ALTER TABLE public.nici ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nici_select_own" ON public.nici;
CREATE POLICY "nici_select_own"
  ON public.nici FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "nici_insert_own" ON public.nici;
CREATE POLICY "nici_insert_own"
  ON public.nici FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "nici_delete_own" ON public.nici;
CREATE POLICY "nici_delete_own"
  ON public.nici FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quote_flags_select_own" ON public.quote_flags;
CREATE POLICY "quote_flags_select_own"
  ON public.quote_flags FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "quote_flags_insert_own" ON public.quote_flags;
CREATE POLICY "quote_flags_insert_own"
  ON public.quote_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "quote_flags_delete_own" ON public.quote_flags;
CREATE POLICY "quote_flags_delete_own"
  ON public.quote_flags FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 6. Odczyt korpusu cytatów (z supabase-quotes-read.sql)
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_glosses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quotes_select_active" ON public.quotes;
CREATE POLICY "quotes_select_active"
  ON public.quotes FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "quote_glosses_select_all" ON public.quote_glosses;
CREATE POLICY "quote_glosses_select_all"
  ON public.quote_glosses FOR SELECT
  TO authenticated, anon
  USING (true);

NOTIFY pgrst, 'reload schema';
