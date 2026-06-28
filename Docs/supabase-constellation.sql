-- Your Soul — konstelacja, flagi, nici, jakość cytatów
-- Uruchom w Supabase SQL Editor po supabase-auth-rls.sql

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS cien text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS quality integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.quote_flags (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quote_id bigint NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quote_id)
);

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

CREATE INDEX IF NOT EXISTS idx_quote_flags_quote_id ON public.quote_flags(quote_id);
CREATE INDEX IF NOT EXISTS idx_nici_user_id ON public.nici(user_id);

-- quality = zachowania − flagi (liczone po stronie serwera)
CREATE OR REPLACE FUNCTION public.recalculate_quote_quality(p_quote_id bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.quotes
  SET quality = (
    SELECT
      COALESCE((SELECT COUNT(*)::integer FROM public.collections c WHERE c.quote_id = p_quote_id), 0)
      - COALESCE((SELECT COUNT(*)::integer FROM public.quote_flags f WHERE f.quote_id = p_quote_id), 0)
  )
  WHERE id = p_quote_id;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_quote_quality()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_quote_quality(OLD.quote_id);
    RETURN OLD;
  END IF;
  PERFORM public.recalculate_quote_quality(NEW.quote_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS collections_quality_trigger ON public.collections;
CREATE TRIGGER collections_quality_trigger
  AFTER INSERT OR DELETE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_quote_quality();

DROP TRIGGER IF EXISTS quote_flags_quality_trigger ON public.quote_flags;
CREATE TRIGGER quote_flags_quality_trigger
  AFTER INSERT OR DELETE ON public.quote_flags
  FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_quote_quality();

ALTER TABLE public.quote_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nici ENABLE ROW LEVEL SECURITY;

-- quote_flags
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

-- nici
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

NOTIFY pgrst, 'reload schema';
