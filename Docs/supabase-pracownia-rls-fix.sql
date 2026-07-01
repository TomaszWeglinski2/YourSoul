-- ============================================================
-- Your Soul — Pracownia: fix RLS infinite recursion
-- Uruchom w Supabase SQL Editor (po supabase-pracownia.sql)
--
-- Problem: notes_select_shared ↔ note_shares_owner_all zapętlały się
-- przy każdym SELECT na notes / note_shares.
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_note_owner(p_note_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.notes n
    WHERE n.id = p_note_id
      AND n.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_note_shared_with_me(p_note_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.note_shares s
    WHERE s.note_id = p_note_id
      AND s.target_user_id = auth.uid()
  );
$$;

DROP POLICY IF EXISTS "notes_select_shared" ON public.notes;
CREATE POLICY "notes_select_shared" ON public.notes FOR SELECT TO authenticated
  USING (
    visibility = 'shared'
    AND public.is_note_shared_with_me(notes.id)
  );

DROP POLICY IF EXISTS "note_shares_owner_all" ON public.note_shares;
CREATE POLICY "note_shares_owner_all" ON public.note_shares FOR ALL TO authenticated
  USING (public.is_note_owner(note_shares.note_id))
  WITH CHECK (public.is_note_owner(note_shares.note_id));

GRANT EXECUTE ON FUNCTION public.is_note_owner(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_note_shared_with_me(bigint) TO authenticated;

NOTIFY pgrst, 'reload schema';
