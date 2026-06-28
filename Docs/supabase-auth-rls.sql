-- ============================================================
-- Your Soul — Auth, profiles, collections, margins, RLS
-- Wklej w Supabase → SQL Editor → Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tabele użytkownika
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  worlds text[] NOT NULL DEFAULT '{}',
  odcisk double precision[] NOT NULL DEFAULT '{0,0,0,0,0}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collections (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quote_id bigint NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_id)
);

CREATE TABLE IF NOT EXISTS public.margins (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quote_id bigint NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  body text NOT NULL,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.margin_reactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  margin_id bigint NOT NULL REFERENCES public.margins(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (margin_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);
CREATE INDEX IF NOT EXISTS idx_margins_user_id ON public.margins(user_id);
CREATE INDEX IF NOT EXISTS idx_margins_quote_public ON public.margins(quote_id) WHERE visibility = 'public';
CREATE INDEX IF NOT EXISTS idx_margin_reactions_margin_id ON public.margin_reactions(margin_id);

-- ------------------------------------------------------------
-- 2. Profil przy rejestracji (trigger)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------
-- 3. Włącz RLS
-- ------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.margin_reactions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 4. profiles — tylko własny wiersz
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ------------------------------------------------------------
-- 5. collections — tylko własne
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "collections_select_own" ON public.collections;
CREATE POLICY "collections_select_own"
  ON public.collections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "collections_insert_own" ON public.collections;
CREATE POLICY "collections_insert_own"
  ON public.collections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "collections_update_own" ON public.collections;
CREATE POLICY "collections_update_own"
  ON public.collections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "collections_delete_own" ON public.collections;
CREATE POLICY "collections_delete_own"
  ON public.collections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6. margins — własne + publiczne tylko SELECT
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "margins_select_own" ON public.margins;
CREATE POLICY "margins_select_own"
  ON public.margins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "margins_select_public" ON public.margins;
CREATE POLICY "margins_select_public"
  ON public.margins FOR SELECT
  TO authenticated, anon
  USING (visibility = 'public');

DROP POLICY IF EXISTS "margins_insert_own" ON public.margins;
CREATE POLICY "margins_insert_own"
  ON public.margins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "margins_update_own" ON public.margins;
CREATE POLICY "margins_update_own"
  ON public.margins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "margins_delete_own" ON public.margins;
CREATE POLICY "margins_delete_own"
  ON public.margins FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 7. margin_reactions — własne + insert tylko pod publicznym marginesem
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "margin_reactions_select_own" ON public.margin_reactions;
CREATE POLICY "margin_reactions_select_own"
  ON public.margin_reactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "margin_reactions_insert_own_on_public" ON public.margin_reactions;
CREATE POLICY "margin_reactions_insert_own_on_public"
  ON public.margin_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.margins m
      WHERE m.id = margin_id
        AND m.visibility = 'public'
    )
  );

DROP POLICY IF EXISTS "margin_reactions_delete_own" ON public.margin_reactions;
CREATE POLICY "margin_reactions_delete_own"
  ON public.margin_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
