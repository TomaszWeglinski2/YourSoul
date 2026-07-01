-- Unikalność cytatu po treści + autor (bezpieczny re-import bez duplikatów).
-- Uruchom w Supabase SQL Editor.

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS uq_quotes_text_author
  ON public.quotes (text, author);

-- Uwaga: w PostgreSQL NULL w author traktuje każdy wiersz jako unikalny.
-- Dla cytatów bez autora deduplikacja odbywa się w logice importu (importQuotes.js).
