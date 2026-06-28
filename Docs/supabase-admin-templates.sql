-- ============================================================
-- Your Soul — szablony redaktorskie (Wieże + Przesilenia)
-- Bezpieczne do uruchomienia obok istniejącego schematu.
-- Aplikacja użytkownika NIE czyta tych tabel (jeszcze) —
-- służą panelowi /admin i Krokom 8–9.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.towers (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  axis smallint NOT NULL CHECK (axis >= 0 AND axis <= 4),
  quote_ids bigint[] NOT NULL,
  meta_gloss text NOT NULL,
  variant smallint NOT NULL DEFAULT 1 CHECK (variant >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.przesilenie_templates (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  axis smallint NOT NULL CHECK (axis >= 0 AND axis <= 4),
  value_a text NOT NULL,
  value_b text NOT NULL,
  beats jsonb NOT NULL DEFAULT '[]'::jsonb,
  choice_a text NOT NULL,
  choice_b text NOT NULL,
  pointa text NOT NULL,
  variant smallint NOT NULL DEFAULT 1 CHECK (variant >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_towers_axis ON public.towers (axis);
CREATE INDEX IF NOT EXISTS idx_przesilenie_templates_axis_variant
  ON public.przesilenie_templates (axis, variant);

-- Tylko admin (service_role) — brak polityk dla anon/authenticated
ALTER TABLE public.towers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.przesilenie_templates ENABLE ROW LEVEL SECURITY;

-- quotes: pole pod edycję w panelu (jeśli jeszcze brak)
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS source_verified boolean NOT NULL DEFAULT false;

-- opcjonalny tag redaktora przy glosach
ALTER TABLE public.quote_glosses ADD COLUMN IF NOT EXISTS angle text;

NOTIFY pgrst, 'reload schema';
