-- ============================================================
-- Fix: wygenerowane kody nie widać na liście /zaproszenia
-- Uruchom w Supabase SQL Editor po supabase-referrals.sql
-- ============================================================

GRANT SELECT ON public.invite_codes TO authenticated;

DROP FUNCTION IF EXISTS public.get_my_invite_codes();

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
  uid uuid := (select auth.uid());
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    ic.id,
    ic.code,
    ic.tier,
    ic.status,
    ic.created_at,
    ic.used_at,
    ic.completed_at
  FROM public.invite_codes ic
  WHERE ic.inviter_id = uid
  ORDER BY ic.created_at DESC
  LIMIT 50;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_invite_codes() TO authenticated;

NOTIFY pgrst, 'reload schema';
