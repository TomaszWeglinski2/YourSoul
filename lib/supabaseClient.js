import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Brakuje zmiennych NEXT_PUBLIC_SUPABASE_URL lub NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Dodaj je do pliku .env.local (lokalnie) lub w panelu Vercel (produkcja)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
