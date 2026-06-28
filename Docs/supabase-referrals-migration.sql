-- ============================================================
-- Your Soul — łatka: ponowne uruchomienie supabase-referrals.sql
-- Uruchom w SQL Editor, gdy dostaniesz błąd 42P13 (zmiana typu funkcji)
-- ============================================================

DROP FUNCTION IF EXISTS public.get_my_invite_codes();

-- Potem uruchom ponownie cały Docs/supabase-referrals.sql
-- albo od CREATE FUNCTION public.get_my_invite_codes() w dół.

NOTIFY pgrst, 'reload schema';
