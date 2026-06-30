-- Skrzynka rozmów prywatnych: odczyt, lista, nieprzeczytane.
-- Uruchom po Docs/supabase-conversations.sql.

CREATE TABLE IF NOT EXISTS public.conversation_read_state (
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT '-infinity'::timestamptz,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS conversation_read_state_user_idx
  ON public.conversation_read_state (user_id);

ALTER TABLE public.conversation_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conversation_read_state_own ON public.conversation_read_state;
CREATE POLICY conversation_read_state_own ON public.conversation_read_state
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Wymagane logowanie.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND uid IN (c.initiator_id, c.recipient_id)
  ) THEN
    RAISE EXCEPTION 'Brak dostępu do rozmowy.';
  END IF;

  INSERT INTO public.conversation_read_state (conversation_id, user_id, last_read_at)
  VALUES (p_conversation_id, uid, now())
  ON CONFLICT (conversation_id, user_id)
  DO UPDATE SET last_read_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE (
  conversation_id uuid,
  other_user_id uuid,
  my_role text,
  payment_status text,
  anchor_quote_id bigint,
  quote_text text,
  quote_author text,
  last_message_body text,
  last_message_at timestamptz,
  last_message_sender_id uuid,
  unread_count bigint,
  is_new boolean,
  needs_reply boolean,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH uid AS (SELECT auth.uid() AS id),
  last_msgs AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.body,
      m.created_at,
      m.sender_id
    FROM public.conversation_messages m
    ORDER BY m.conversation_id, m.created_at DESC
  )
  SELECT
    c.id,
    CASE
      WHEN c.initiator_id = (SELECT id FROM uid) THEN c.recipient_id
      ELSE c.initiator_id
    END,
    CASE
      WHEN c.initiator_id = (SELECT id FROM uid) THEN 'initiator'
      ELSE 'recipient'
    END,
    c.payment_status,
    c.anchor_quote_id,
    q.text,
    q.author,
    lm.body,
    lm.created_at,
    lm.sender_id,
    COALESCE((
      SELECT count(*)::bigint
      FROM public.conversation_messages m
      WHERE m.conversation_id = c.id
        AND m.sender_id <> (SELECT id FROM uid)
        AND m.created_at > COALESCE(rs.last_read_at, '-infinity'::timestamptz)
    ), 0),
    (
      c.payment_status IN ('stub_unlocked', 'paid')
      AND rs.last_read_at IS NULL
    ),
    (
      c.payment_status IN ('stub_unlocked', 'paid')
      AND lm.sender_id IS NOT NULL
      AND lm.sender_id <> (SELECT id FROM uid)
    ),
    GREATEST(
      c.created_at,
      COALESCE(c.unlocked_at, c.created_at),
      COALESCE(lm.created_at, c.created_at)
    )
  FROM public.conversations c
  JOIN public.quotes q ON q.id = c.anchor_quote_id
  LEFT JOIN last_msgs lm ON lm.conversation_id = c.id
  LEFT JOIN public.conversation_read_state rs
    ON rs.conversation_id = c.id
   AND rs.user_id = (SELECT id FROM uid)
  WHERE (SELECT id FROM uid) IN (c.initiator_id, c.recipient_id)
  ORDER BY GREATEST(
    c.created_at,
    COALESCE(c.unlocked_at, c.created_at),
    COALESCE(lm.created_at, c.created_at)
  ) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_unread_conversation_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::bigint
  FROM public.get_my_conversations() row
  WHERE row.is_new
     OR row.needs_reply
     OR row.unread_count > 0
     OR (
       row.payment_status = 'pending'
       AND row.my_role = 'recipient'
     );
$$;

CREATE OR REPLACE FUNCTION public.get_conversation_with_peer(p_other_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id
  FROM public.conversations c
  WHERE auth.uid() IN (c.initiator_id, c.recipient_id)
    AND p_other_user_id IN (c.initiator_id, c.recipient_id)
    AND p_other_user_id <> auth.uid()
  ORDER BY GREATEST(
    c.created_at,
    COALESCE(c.unlocked_at, c.created_at)
  ) DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_conversations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_conversation_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_with_peer(uuid) TO authenticated;
