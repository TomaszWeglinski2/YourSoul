import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export async function fetchReferralStatus() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { data, error } = await supabase.rpc("get_my_referral_status");

  if (error) {
    const hint = error.message?.includes("get_my_referral_status")
      ? " Uruchom Docs/supabase-referrals.sql w Supabase."
      : "";
    return { ok: false, error: `${error.message}${hint}` };
  }

  return { ok: true, status: data ?? {} };
}

export async function fetchMyInviteCodes() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany.", codes: [] };
  }

  const { data, error } = await supabase.rpc("get_my_invite_codes");

  if (error) {
    return { ok: false, error: error.message, codes: [] };
  }

  return { ok: true, codes: data ?? [] };
}

export async function createInviteCode() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { data, error } = await supabase.rpc("create_invite_code");

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, code: data };
}

export async function claimInviteCode(code) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { error } = await supabase.rpc("claim_invite_code", {
    p_code: code.trim(),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function fetchPublicReferralTree(limit = 200) {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.rpc("get_public_referral_tree", {
    p_limit: limit,
  });

  if (error) {
    const hint = error.message?.includes("get_public_referral_tree")
      ? " Uruchom Docs/supabase-referrals.sql w Supabase."
      : "";
    return { ok: false, error: `${error.message}${hint}`, edges: [] };
  }

  return { ok: true, edges: data ?? [] };
}

export async function fetchTrustJournal() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany.", entries: [] };
  }

  const { data, error } = await supabase
    .from("trust_journal")
    .select("id, delta, trust_before, trust_after, reason, meta, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return { ok: false, error: error.message, entries: [] };
  }

  return { ok: true, entries: data ?? [] };
}

const INVITE_STORAGE_KEY = "your-soul-pending-invite";

export function storePendingInviteCode(code) {
  if (typeof window === "undefined" || !code?.trim()) return;
  sessionStorage.setItem(INVITE_STORAGE_KEY, code.trim().toUpperCase());
}

export function readPendingInviteCode() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(INVITE_STORAGE_KEY) ?? "";
}

export function clearPendingInviteCode() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(INVITE_STORAGE_KEY);
}

export async function applyPendingInviteCodeIfAny() {
  const code = readPendingInviteCode();
  if (!code) {
    return { ok: true, applied: false };
  }

  const result = await claimInviteCode(code);
  if (result.ok) {
    clearPendingInviteCode();
    return { ok: true, applied: true };
  }

  return result;
}
