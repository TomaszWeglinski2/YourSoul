-- Your Soul — odczyt korpusu cytatów przez zalogowanych użytkowników
-- Uruchom w Supabase SQL Editor gdy zielnik/konstelacja są puste mimo wpisów w collections

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
