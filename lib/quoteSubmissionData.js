import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const SQL_DOC = "Docs/supabase-quote-submissions.sql";

function sqlHint(error) {
  const msg = error?.message ?? "";
  if (
    msg.includes("relation") ||
    msg.includes("does not exist") ||
    msg.includes("quote_submissions")
  ) {
    return ` Uruchom ${SQL_DOC} w Supabase.`;
  }
  return "";
}

async function getCurrentUser(supabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: error?.message ?? "Nie jesteś zalogowany." };
  }

  return { user };
}

export async function fetchMyQuoteSubmissions() {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError, submissions: [] };
  }

  const { data, error } = await supabase
    .from("quote_submissions")
    .select(
      "id, user_quote_id, text, author, work, year, status, reviewer_note, accepted_quote_id, created_at, reviewed_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error)}`,
      submissions: [],
    };
  }

  return { ok: true, submissions: data ?? [] };
}

export async function fetchSubmissionQuota() {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError, used: 0 };
  }

  const { data, error } = await supabase.rpc(
    "count_my_quote_submissions_this_month"
  );

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error)}`,
      used: 0,
    };
  }

  return { ok: true, used: Number(data ?? 0) };
}
