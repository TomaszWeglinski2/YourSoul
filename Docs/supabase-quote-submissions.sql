-- ============================================================
-- Your Soul — zgłoszenia cytatów do korpusu Wyroczni
-- Uruchom w Supabase SQL Editor po supabase-auth-rls.sql
-- i supabase-profiles-username.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.quote_submissions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_quote_id bigint REFERENCES public.user_quotes(id) ON DELETE SET NULL,
  text text NOT NULL,
  author text,
  work text,
  year text,
  public_domain boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  reviewer_note text,
  accepted_quote_id bigint REFERENCES public.quotes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_quote_submissions_user_id ON public.quote_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_status ON public.quote_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quote_submissions_created ON public.quote_submissions(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_quote_submissions_user_quote
  ON public.quote_submissions(user_id, user_quote_id)
  WHERE user_quote_id IS NOT NULL;

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS proposed_by text;

ALTER TABLE public.quote_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subs_insert_own" ON public.quote_submissions;
CREATE POLICY "subs_insert_own" ON public.quote_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "subs_select_own" ON public.quote_submissions;
CREATE POLICY "subs_select_own" ON public.quote_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Normalizacja tekstu do porównań duplikatów
CREATE OR REPLACE FUNCTION public.normalize_quote_text(p_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(
    lower(trim(regexp_replace(trim(coalesce(p_text, '')), '\s+', ' ', 'g'))),
    ''
  );
$$;

-- Zgłoszenia w bieżącym miesiącu (Europe/Warsaw)
CREATE OR REPLACE FUNCTION public.count_my_quote_submissions_this_month()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.quote_submissions s
  WHERE s.user_id = auth.uid()
    AND s.created_at >= (
      date_trunc(
        'month',
        (now() AT TIME ZONE 'Europe/Warsaw')
      ) AT TIME ZONE 'Europe/Warsaw'
    );
$$;

-- Sprawdzenie duplikatu w korpusie i oczekujących zgłoszeniach
CREATE OR REPLACE FUNCTION public.check_quote_submission_duplicate(p_text text, p_author text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  norm text := public.normalize_quote_text(p_text);
  norm_author text := nullif(lower(trim(coalesce(p_author, ''))), '');
  corpus_id bigint;
  pending_id bigint;
  prefix text;
BEGIN
  IF norm IS NULL OR length(norm) < 8 THEN
    RETURN json_build_object('ok', false, 'reason', 'too_short');
  END IF;

  SELECT q.id INTO corpus_id
  FROM public.quotes q
  WHERE public.normalize_quote_text(q.text) = norm
    AND (
      (norm_author IS NULL AND (q.author IS NULL OR trim(q.author) = ''))
      OR lower(trim(coalesce(q.author, ''))) = norm_author
    )
  LIMIT 1;

  IF corpus_id IS NOT NULL THEN
    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'kind', 'corpus_exact',
      'quote_id', corpus_id
    );
  END IF;

  SELECT q.id INTO corpus_id
  FROM public.quotes q
  WHERE public.normalize_quote_text(q.text) = norm
  LIMIT 1;

  IF corpus_id IS NOT NULL THEN
    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'kind', 'corpus_text',
      'quote_id', corpus_id
    );
  END IF;

  prefix := left(norm, 48);
  IF length(prefix) >= 24 THEN
    SELECT q.id INTO corpus_id
    FROM public.quotes q
    WHERE public.normalize_quote_text(q.text) LIKE prefix || '%'
       OR prefix LIKE public.normalize_quote_text(q.text) || '%'
    LIMIT 1;

    IF corpus_id IS NOT NULL THEN
      RETURN json_build_object(
        'ok', true,
        'duplicate', true,
        'kind', 'corpus_similar',
        'quote_id', corpus_id
      );
    END IF;
  END IF;

  SELECT s.id INTO pending_id
  FROM public.quote_submissions s
  WHERE s.status = 'pending'
    AND public.normalize_quote_text(s.text) = norm
  LIMIT 1;

  IF pending_id IS NOT NULL THEN
    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'kind', 'pending',
      'submission_id', pending_id
    );
  END IF;

  RETURN json_build_object('ok', true, 'duplicate', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_my_quote_submissions_this_month() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_quote_submission_duplicate(text, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
