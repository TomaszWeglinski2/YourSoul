import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { resolveOracleDailyLimit } from "@/lib/oracleLimits";

function sqlHint(error, fnName) {
  if (error?.message?.includes(fnName)) {
    return " Uruchom Docs/supabase-oracle-draws.sql w Supabase.";
  }
  return "";
}

async function loadProfilePlan() {
  // Gdy w profiles pojawi się pole plan — podłącz tutaj.
  return null;
}

export async function fetchOracleDrawStatus() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany.", status: null };
  }

  const dailyLimit = resolveOracleDailyLimit(await loadProfilePlan());

  const { data, error } = await supabase.rpc("get_oracle_draw_status", {
    p_daily_limit: dailyLimit,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "get_oracle_draw_status")}`,
      status: null,
    };
  }

  return { ok: true, status: data };
}

export async function fetchThresholdSnapshot() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany.", snapshot: null };
  }

  const dailyLimit = resolveOracleDailyLimit(await loadProfilePlan());

  const [sinceRes, oracleRes, unreadRes] = await Promise.all([
    supabase.rpc("get_threshold_since_last_visit"),
    supabase.rpc("get_oracle_draw_status", { p_daily_limit: dailyLimit }),
    supabase.rpc("get_unread_conversation_count"),
  ]);

  if (sinceRes.error) {
    return {
      ok: false,
      error: `${sinceRes.error.message}${sqlHint(sinceRes.error, "get_threshold_since_last_visit")}`,
      snapshot: null,
    };
  }

  if (oracleRes.error) {
    return {
      ok: false,
      error: `${oracleRes.error.message}${sqlHint(oracleRes.error, "get_oracle_draw_status")}`,
      snapshot: null,
    };
  }

  const unreadHint = unreadRes.error?.message?.includes("get_unread_conversation_count")
    ? " Uruchom Docs/supabase-conversations-inbox.sql w Supabase."
    : "";

  if (unreadRes.error) {
    return {
      ok: false,
      error: `${unreadRes.error.message}${unreadHint}`,
      snapshot: null,
    };
  }

  return {
    ok: true,
    snapshot: {
      newResonances: Number(sinceRes.data?.new_resonances ?? 0),
      lastVisitAt: sinceRes.data?.last_visit_at ?? null,
      oracle: oracleRes.data,
      unreadConversations: Number(unreadRes.data ?? 0),
    },
  };
}

export async function markThresholdVisit() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false };
  }

  const { error } = await supabase.rpc("mark_threshold_visit");
  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "mark_threshold_visit")}`,
    };
  }

  return { ok: true };
}
