-- ============================================================
-- Fix: pula zaproszeń 0/0 mimo odblokowania (trusted / Wrota)
-- Uruchom w Supabase SQL Editor po supabase-referrals.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_invite_pool_for_user(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_pool integer;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 0;
  END IF;

  new_pool := public.compute_invite_pool_for_user(p_user_id);

  UPDATE public.profiles
  SET invite_pool = new_pool, invite_pool_computed_at = now()
  WHERE id = p_user_id;

  RETURN new_pool;
END;
$$;

CREATE OR REPLACE FUNCTION public.effective_novice_until(p_user_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.wrota_completed_at IS NULL AND p.novice_until_override IS NULL THEN NULL
    WHEN p.invite_access_tier = 'trusted' THEN COALESCE(p.wrota_completed_at, p.novice_until_override)
    WHEN p.novice_until_override IS NOT NULL THEN p.novice_until_override
    ELSE p.wrota_completed_at + interval '30 days'
  END
  FROM public.profiles p
  WHERE p.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_status()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
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

  pool := public.refresh_invite_pool_for_user(uid);
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

CREATE OR REPLACE FUNCTION public.trigger_refresh_pool_after_wrota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.wrota_completed_at IS NOT NULL
     AND (OLD.wrota_completed_at IS NULL OR TG_OP = 'INSERT') THEN
    PERFORM public.refresh_invite_pool_for_user(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_refresh_invite_pool ON public.profiles;
CREATE TRIGGER profiles_refresh_invite_pool
  AFTER INSERT OR UPDATE OF wrota_completed_at, trust_score ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_pool_after_wrota();

-- Jednorazowe uzupełnienie pul dla istniejących kont
UPDATE public.profiles p
SET
  invite_pool = public.compute_invite_pool_for_user(p.id),
  invite_pool_computed_at = now()
WHERE NOT p.is_banned;

GRANT EXECUTE ON FUNCTION public.refresh_invite_pool_for_user(uuid) TO authenticated;
