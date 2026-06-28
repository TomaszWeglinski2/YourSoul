-- Opcjonalnie, jeśli import glos ma używać kolumny angle:
ALTER TABLE public.quote_glosses ADD COLUMN IF NOT EXISTS angle text;
NOTIFY pgrst, 'reload schema';
