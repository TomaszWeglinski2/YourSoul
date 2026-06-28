-- ============================================================
-- Your Soul — system poleceń i dzielenia
-- Uruchom w Supabase SQL Editor po supabase-auth-rls.sql
-- Cron: Docs/supabase-referrals-cron.sql (po tym pliku)
-- ============================================================
--
-- Zasady:
--   • Kod zaproszenia realizuje się dopiero po Wrótach zaproszonego
--   • Okres nowicjusza: 30 dni od Wrót (kod zwykły) lub od razu (kod zaufany / admin)
--   • Pula: 3 / 5 / 8 (zaufanie) + 2 za ugruntowanego zaproszonego, cap 10
--   • Kara przy banie zaproszonego; wszystkie zmiany zaufania → trust_journal
-- ============================================================

-- ------------------------------------------------------------
-- 1. Rozszerzenie profiles
-- ------------------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wrota_completed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_pool integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_pool_computed_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS invite_access_tier text NOT NULL DEFAULT 'regular';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS novice_until_override timestamptz;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_invite_access_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_invite_access_tier_check
  CHECK (invite_access_tier IN ('regular', 'trusted'));

-- ------------------------------------------------------------
-- 2. invite_codes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  inviter_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier text NOT NULL DEFAULT 'regular',
  is_admin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'pending_wrota', 'completed', 'revoked')),
  used_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  used_at timestamptz,
  completed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'regular';
ALTER TABLE public.invite_codes ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
ALTER TABLE public.invite_codes ALTER COLUMN inviter_id DROP NOT NULL;

ALTER TABLE public.invite_codes DROP CONSTRAINT IF EXISTS invite_codes_tier_check;
ALTER TABLE public.invite_codes ADD CONSTRAINT invite_codes_tier_check
  CHECK (tier IN ('regular', 'trusted'));

CREATE INDEX IF NOT EXISTS idx_invite_codes_inviter
  ON public.invite_codes(inviter_id, status);
CREATE INDEX IF NOT EXISTS idx_invite_codes_used_by
  ON public.invite_codes(used_by) WHERE used_by IS NOT NULL;

-- ------------------------------------------------------------
-- 3. referral_edges (tylko po Wrótach)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_edges (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  inviter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  invite_code_id bigint NOT NULL REFERENCES public.invite_codes(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  grounded_at timestamptz,
  invitee_banned_at timestamptz,
  UNIQUE (inviter_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_edges_inviter
  ON public.referral_edges(inviter_id);

-- ------------------------------------------------------------
-- 4. Dziennik zaufania
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trust_journal (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  trust_before integer NOT NULL,
  trust_after integer NOT NULL,
  reason text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_journal_user
  ON public.trust_journal(user_id, created_at DESC);

-- ------------------------------------------------------------
-- 5. Monitoring nadużyć
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_abuse_flags (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warn'
    CHECK (severity IN ('info', 'warn', 'critical')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_referral_abuse_open
  ON public.referral_abuse_flags(user_id) WHERE reviewed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_referral_abuse_one_open_per_type
  ON public.referral_abuse_flags(user_id, flag_type)
  WHERE reviewed_at IS NULL;

-- ------------------------------------------------------------
-- 6. RLS
-- ------------------------------------------------------------
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_abuse_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invite_codes_select_own" ON public.invite_codes;
CREATE POLICY "invite_codes_select_own"
  ON public.invite_codes FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = used_by);

DROP POLICY IF EXISTS "referral_edges_select_public" ON public.referral_edges;
CREATE POLICY "referral_edges_select_public"
  ON public.referral_edges FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "trust_journal_select_own" ON public.trust_journal;
CREATE POLICY "trust_journal_select_own"
  ON public.trust_journal FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- abuse_flags: brak polityki dla authenticated = tylko service_role (admin)

-- ------------------------------------------------------------
-- 7. Pomocnicze: Wróta + zaufanie
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profile_has_wrota(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.wrota_completed_at IS NOT NULL
      AND p.odcisk IS NOT NULL
      AND p.odcisk <> '{0,0,0,0,0}'::double precision[]
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_wrota_completed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.odcisk IS NOT NULL
     AND NEW.odcisk <> '{0,0,0,0,0}'::double precision[]
     AND NEW.wrota_completed_at IS NULL THEN
    NEW.wrota_completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_wrota ON public.profiles;
CREATE TRIGGER profiles_sync_wrota
  BEFORE INSERT OR UPDATE OF odcisk ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_wrota_completed_at();

CREATE OR REPLACE FUNCTION public.log_trust_change(
  p_user_id uuid,
  p_delta integer,
  p_reason text,
  p_meta jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  before_score integer;
  after_score integer;
BEGIN
  SELECT trust_score INTO before_score
  FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF before_score IS NULL THEN
    RETURN 0;
  END IF;

  after_score := GREATEST(0, before_score + p_delta);

  UPDATE public.profiles
  SET trust_score = after_score
  WHERE id = p_user_id;

  INSERT INTO public.trust_journal (user_id, delta, trust_before, trust_after, reason, meta)
  VALUES (p_user_id, p_delta, before_score, after_score, p_reason, p_meta);

  RETURN after_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_invitee_grounded(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.profile_has_wrota(p_user_id)
    AND (
      (SELECT COUNT(*)::integer FROM public.collections c WHERE c.user_id = p_user_id) >= 3
      OR (
        (SELECT COUNT(*)::integer FROM public.collections c WHERE c.user_id = p_user_id) >= 1
        AND (SELECT COUNT(*)::integer FROM public.margins m WHERE m.user_id = p_user_id) >= 1
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.base_invite_pool_for_trust(p_trust integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_trust >= 25 THEN 8
    WHEN p_trust >= 10 THEN 5
    ELSE 3
  END;
$$;

CREATE OR REPLACE FUNCTION public.compute_invite_pool_for_user(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trust_val integer;
  base_pool integer;
  grounded_bonus integer;
  ban_penalty integer;
  total integer;
BEGIN
  SELECT p.trust_score INTO trust_val
  FROM public.profiles p WHERE p.id = p_user_id;

  IF trust_val IS NULL THEN
    RETURN 0;
  END IF;

  base_pool := public.base_invite_pool_for_trust(trust_val);

  SELECT COALESCE(COUNT(*)::integer, 0) * 2 INTO grounded_bonus
  FROM public.referral_edges e
  WHERE e.inviter_id = p_user_id
    AND e.grounded_at IS NOT NULL
    AND e.invitee_banned_at IS NULL;

  SELECT COALESCE(COUNT(*)::integer, 0) * 2 INTO ban_penalty
  FROM public.referral_edges e
  WHERE e.inviter_id = p_user_id
    AND e.invitee_banned_at IS NOT NULL;

  total := base_pool + grounded_bonus - ban_penalty;
  total := GREATEST(0, LEAST(10, total));

  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_active_invite_codes(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.invite_codes ic
  WHERE ic.inviter_id = p_user_id
    AND ic.status IN ('available', 'pending_wrota', 'completed');
$$;

-- ------------------------------------------------------------
-- 8. Realizacja kodu po Wrótach
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.effective_novice_until(p_user_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.wrota_completed_at IS NULL THEN NULL
    WHEN p.invite_access_tier = 'trusted' THEN p.wrota_completed_at
    WHEN p.novice_until_override IS NOT NULL THEN p.novice_until_override
    ELSE p.wrota_completed_at + interval '30 days'
  END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.finalize_referral_on_wrota(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_row public.invite_codes%ROWTYPE;
BEGIN
  IF NOT public.profile_has_wrota(p_user_id) THEN
    RETURN false;
  END IF;

  SELECT * INTO code_row
  FROM public.invite_codes
  WHERE used_by = p_user_id
    AND status = 'pending_wrota'
  ORDER BY used_at ASC
  LIMIT 1;

  IF code_row.id IS NULL THEN
    RETURN false;
  END IF;

  IF code_row.inviter_id IS NOT NULL AND code_row.inviter_id = p_user_id THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET invite_access_tier = code_row.tier
  WHERE id = p_user_id;

  IF code_row.inviter_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.referral_edges WHERE invitee_id = p_user_id
     ) THEN
    INSERT INTO public.referral_edges (inviter_id, invitee_id, invite_code_id)
    VALUES (code_row.inviter_id, p_user_id, code_row.id);

    PERFORM public.log_trust_change(
      code_row.inviter_id,
      5,
      'referral_wrota_completed',
      jsonb_build_object('invitee_id', p_user_id, 'invite_code_id', code_row.id)
    );
  END IF;

  UPDATE public.invite_codes
  SET status = 'completed', completed_at = now()
  WHERE id = code_row.id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_finalize_referral_after_wrota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wrota_completed_at IS NOT NULL
     AND (OLD.wrota_completed_at IS NULL OR TG_OP = 'INSERT') THEN
    PERFORM public.finalize_referral_on_wrota(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_finalize_referral ON public.profiles;
CREATE TRIGGER profiles_finalize_referral
  AFTER INSERT OR UPDATE OF wrota_completed_at, odcisk ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_finalize_referral_after_wrota();

-- ------------------------------------------------------------
-- 9. claim + create invite codes
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_create_invite_codes(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_user_id
      AND NOT p.is_banned
      AND public.profile_has_wrota(p.id)
      AND now() >= public.effective_novice_until(p.id)
  );
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_code_string()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  pool integer;
  used integer;
  new_code text;
  attempts integer := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nie jesteś zalogowany.';
  END IF;

  IF NOT public.can_create_invite_codes(uid) THEN
    RAISE EXCEPTION 'Zaproszenia odblokowują się po okresie nowicjusza (30 dni dla kodu zwykłego, od razu dla zaufanego).';
  END IF;

  SELECT invite_pool INTO pool FROM public.profiles WHERE id = uid;
  pool := public.compute_invite_pool_for_user(uid);
  UPDATE public.profiles SET invite_pool = pool, invite_pool_computed_at = now() WHERE id = uid;
  used := public.count_active_invite_codes(uid);

  IF used >= pool THEN
    RAISE EXCEPTION 'Wykorzystałeś pulę zaproszeń (% z %).', used, pool;
  END IF;

  LOOP
    attempts := attempts + 1;
    IF attempts > 20 THEN
      RAISE EXCEPTION 'Nie udało się wygenerować kodu.';
    END IF;
    new_code := public.generate_invite_code_string();
    BEGIN
      INSERT INTO public.invite_codes (code, inviter_id, tier)
      VALUES (new_code, uid, 'regular');
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;

  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  normalized text;
  code_row public.invite_codes%ROWTYPE;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nie jesteś zalogowany.';
  END IF;

  normalized := upper(trim(p_code));

  IF length(normalized) < 4 THEN
    RAISE EXCEPTION 'Nieprawidłowy kod.';
  END IF;

  IF public.profile_has_wrota(uid) THEN
    RAISE EXCEPTION 'Kodu nie można wpisać po przejściu Wrót.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.referral_edges WHERE invitee_id = uid) THEN
    RAISE EXCEPTION 'Masz już przypisanego zapraszającego.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.invite_codes
    WHERE used_by = uid AND status = 'pending_wrota'
  ) THEN
    RAISE EXCEPTION 'Masz już oczekujący kod — dokończ Wrota.';
  END IF;

  SELECT * INTO code_row
  FROM public.invite_codes
  WHERE code = normalized AND status = 'available'
  FOR UPDATE;

  IF code_row.id IS NULL THEN
    RAISE EXCEPTION 'Kod niedostępny lub wygasły.';
  END IF;

  IF code_row.inviter_id IS NOT NULL AND code_row.inviter_id = uid THEN
    RAISE EXCEPTION 'Nie możesz użyć własnego kodu.';
  END IF;

  UPDATE public.invite_codes
  SET status = 'pending_wrota', used_by = uid, used_at = now()
  WHERE id = code_row.id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_invite_code(text) TO authenticated;

-- Walidacja kodu przed rejestracją (bez logowania)
CREATE OR REPLACE FUNCTION public.validate_invite_code(p_code text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized text;
BEGIN
  normalized := upper(trim(p_code));
  IF length(normalized) < 4 THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.invite_codes ic
    WHERE ic.code = normalized
      AND ic.status = 'available'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite_code(text) TO anon, authenticated;

-- ------------------------------------------------------------
-- 10. Dashboard + publiczne drzewo
-- (DROP wymagany przy zmianie kolumn RETURNS TABLE)
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_my_invite_codes();

CREATE OR REPLACE FUNCTION public.get_my_referral_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  p public.profiles%ROWTYPE;
  pool integer;
  used integer;
  novice_until timestamptz;
  can_invite boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE id = uid;

  pool := COALESCE(p.invite_pool, 0);
  used := public.count_active_invite_codes(uid);
  novice_until := public.effective_novice_until(uid);
  can_invite := public.can_create_invite_codes(uid);

  RETURN jsonb_build_object(
    'trust_score', p.trust_score,
    'invite_pool', pool,
    'invite_codes_used', used,
    'invite_codes_remaining', GREATEST(0, pool - used),
    'wrota_completed_at', p.wrota_completed_at,
    'invite_access_tier', p.invite_access_tier,
    'novice_until', novice_until,
    'can_create_codes', can_invite,
    'is_banned', p.is_banned,
    'referrals_completed', (
      SELECT COUNT(*)::integer FROM public.referral_edges e WHERE e.inviter_id = uid
    ),
    'referrals_grounded', (
      SELECT COUNT(*)::integer FROM public.referral_edges e
      WHERE e.inviter_id = uid AND e.grounded_at IS NOT NULL
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_invite_codes()
RETURNS TABLE (
  id bigint,
  code text,
  tier text,
  status text,
  created_at timestamptz,
  used_at timestamptz,
  completed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT ic.id, ic.code, ic.tier, ic.status, ic.created_at, ic.used_at, ic.completed_at
  FROM public.invite_codes ic
  WHERE ic.inviter_id = uid
  ORDER BY ic.created_at DESC
  LIMIT 50;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_referral_tree(p_limit integer DEFAULT 200)
RETURNS TABLE (
  edge_id bigint,
  inviter_id uuid,
  invitee_id uuid,
  inviter_label text,
  invitee_label text,
  created_at timestamptz,
  grounded_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.inviter_id,
    e.invitee_id,
    'Podróżnik ·' || right(e.inviter_id::text, 4),
    'Podróżnik ·' || right(e.invitee_id::text, 4),
    e.created_at,
    e.grounded_at
  FROM public.referral_edges e
  ORDER BY e.created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 500));
$$;

GRANT EXECUTE ON FUNCTION public.get_my_referral_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_invite_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_referral_tree(integer) TO anon, authenticated;

-- ------------------------------------------------------------
-- 11. Nocne zadanie: pule, ugruntowanie, kary, monitoring
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.scan_referral_abuse()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u record;
  flags_added integer := 0;
BEGIN
  FOR u IN
    SELECT ic.inviter_id AS user_id, COUNT(*)::integer AS cnt
    FROM public.invite_codes ic
    WHERE ic.created_at >= now() - interval '24 hours'
    GROUP BY ic.inviter_id
    HAVING COUNT(*) > 5
  LOOP
    INSERT INTO public.referral_abuse_flags (user_id, flag_type, severity, details)
    VALUES (
      u.user_id,
      'burst_codes_24h',
      'warn',
      jsonb_build_object('count', u.cnt)
    )
    ON CONFLICT (user_id, flag_type) WHERE reviewed_at IS NULL DO UPDATE
      SET details = EXCLUDED.details, created_at = now();
    flags_added := flags_added + 1;
  END LOOP;

  FOR u IN
    SELECT e.inviter_id AS user_id, COUNT(*)::integer AS cnt
    FROM public.referral_edges e
    JOIN public.profiles p ON p.id = e.invitee_id
    WHERE p.is_banned
    GROUP BY e.inviter_id
    HAVING COUNT(*) >= 2
  LOOP
    INSERT INTO public.referral_abuse_flags (user_id, flag_type, severity, details)
    VALUES (
      u.user_id,
      'multiple_banned_invitees',
      'critical',
      jsonb_build_object('banned_count', u.cnt)
    )
    ON CONFLICT (user_id, flag_type) WHERE reviewed_at IS NULL DO UPDATE
      SET details = EXCLUDED.details, created_at = now(), severity = 'critical';
    flags_added := flags_added + 1;
  END LOOP;

  RETURN flags_added;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_nightly_referrals()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e record;
  p record;
  new_pool integer;
  users_updated integer := 0;
  grounded_new integer := 0;
  bans_processed integer := 0;
BEGIN
  -- Ugruntowani zaproszeni → bonus zaufania (+3) i grounded_at
  FOR e IN
    SELECT re.*
    FROM public.referral_edges re
    WHERE re.grounded_at IS NULL
      AND re.invitee_banned_at IS NULL
  LOOP
    IF public.is_invitee_grounded(e.invitee_id) THEN
      UPDATE public.referral_edges
      SET grounded_at = now()
      WHERE id = e.id;

      PERFORM public.log_trust_change(
        e.inviter_id,
        3,
        'invitee_grounded',
        jsonb_build_object('invitee_id', e.invitee_id, 'edge_id', e.id)
      );
      grounded_new := grounded_new + 1;
    END IF;
  END LOOP;

  -- Bany zaproszonych → kara invitera
  FOR e IN
    SELECT re.*, p.banned_at
    FROM public.referral_edges re
    JOIN public.profiles p ON p.id = e.invitee_id
    WHERE p.is_banned AND re.invitee_banned_at IS NULL
  LOOP
    UPDATE public.referral_edges
    SET invitee_banned_at = COALESCE(e.banned_at, now())
    WHERE id = e.id;

    PERFORM public.log_trust_change(
      e.inviter_id,
      -15,
      'invitee_banned',
      jsonb_build_object('invitee_id', e.invitee_id, 'edge_id', e.id)
    );

    IF e.grounded_at IS NOT NULL THEN
      PERFORM public.log_trust_change(
        e.inviter_id,
        -3,
        'invitee_banned_grounded_reversal',
        jsonb_build_object('invitee_id', e.invitee_id, 'edge_id', e.id)
      );
    END IF;

    bans_processed := bans_processed + 1;
  END LOOP;

  -- Przeliczenie puli zaproszeń
  FOR p IN
    SELECT id, invite_pool FROM public.profiles WHERE NOT is_banned
  LOOP
    new_pool := public.compute_invite_pool_for_user(p.id);

    UPDATE public.profiles
    SET invite_pool = new_pool, invite_pool_computed_at = now()
    WHERE id = p.id;

    users_updated := users_updated + 1;
  END LOOP;

  PERFORM public.scan_referral_abuse();

  RETURN jsonb_build_object(
    'users_updated', users_updated,
    'grounded_new', grounded_new,
    'bans_processed', bans_processed,
    'abuse_flags', (SELECT COUNT(*)::integer FROM public.referral_abuse_flags WHERE reviewed_at IS NULL)
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
