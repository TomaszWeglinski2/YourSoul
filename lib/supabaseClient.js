import { getSupabaseBrowserClient } from "./supabaseBrowser";

/** @deprecated Użyj getSupabaseBrowserClient() — zachowane dla kompatybilności. */
export const supabase = getSupabaseBrowserClient();
