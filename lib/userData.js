import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

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

async function ensureProfile(supabase, userId) {
  const { error } = await supabase.from("profiles").upsert(
    { id: userId },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function upsertProfile({ worlds, odcisk }) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      worlds,
      odcisk,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function addToCollection(quoteId) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const profileResult = await ensureProfile(supabase, user.id);
  if (!profileResult.ok) {
    return profileResult;
  }

  const { error } = await supabase.from("collections").insert({
    user_id: user.id,
    quote_id: quoteId,
  });

  if (error) {
    // Cytat już w kolekcji — traktujemy jako sukces.
    if (error.code === "23505") {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function saveMargin({ quoteId, body, visibility }) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const profileResult = await ensureProfile(supabase, user.id);
  if (!profileResult.ok) {
    return profileResult;
  }

  const { data: existing } = await supabase
    .from("margins")
    .select("id")
    .eq("user_id", user.id)
    .eq("quote_id", quoteId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("margins")
      .update({
        body,
        visibility,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, marginId: existing.id };
  }

  const { data, error } = await supabase
    .from("margins")
    .insert({
      user_id: user.id,
      quote_id: quoteId,
      body,
      visibility,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, marginId: data.id };
}

export async function fetchPublicMargins(quoteId) {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("margins")
    .select("id, body, user_id, created_at")
    .eq("quote_id", quoteId)
    .eq("visibility", "public")
    .order("created_at", { ascending: false });

  if (error) {
    return { ok: false, error: error.message, margins: [] };
  }

  return { ok: true, margins: data ?? [] };
}

export async function fetchMyReactionsForMargins(marginIds) {
  if (!marginIds.length) {
    return { ok: true, reactedIds: new Set() };
  }

  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true, reactedIds: new Set() };
  }

  const { data, error } = await supabase
    .from("margin_reactions")
    .select("margin_id")
    .eq("user_id", user.id)
    .in("margin_id", marginIds);

  if (error) {
    return { ok: false, error: error.message, reactedIds: new Set() };
  }

  return {
    ok: true,
    reactedIds: new Set((data ?? []).map((row) => row.margin_id)),
  };
}

export async function toggleMarginReaction(marginId) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { data: existing } = await supabase
    .from("margin_reactions")
    .select("id")
    .eq("margin_id", marginId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("margin_reactions")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, active: false };
  }

  const { error } = await supabase.from("margin_reactions").insert({
    margin_id: marginId,
    user_id: user.id,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, active: true };
}

export async function fetchMySavedData() {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const [profileRes, collectionsRes, marginsRes, reactionsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("worlds, odcisk, updated_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("collections")
        .select("id, created_at, quote_id, quotes(text, author, work)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("margins")
        .select("id, body, visibility, created_at, quote_id, quotes(text, author)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("margin_reactions")
        .select("id, margin_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const firstError =
    profileRes.error?.message ??
    collectionsRes.error?.message ??
    marginsRes.error?.message ??
    reactionsRes.error?.message;

  if (firstError) {
    return { ok: false, error: firstError };
  }

  return {
    ok: true,
    email: user.email,
    profile: profileRes.data,
    collections: collectionsRes.data ?? [],
    margins: marginsRes.data ?? [],
    reactions: reactionsRes.data ?? [],
  };
}

const QUOTE_FIELDS = "id, text, author, work, axes, cien";

/** Collections + osobne pobranie quotes (omija problemy z joinem / RLS embed). */
async function fetchCollectionsWithQuotes(supabase, userId, { ascending = true } = {}) {
  const { data: collections, error: collError } = await supabase
    .from("collections")
    .select("id, quote_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending });

  if (collError) {
    return { ok: false, error: collError.message, collections: [] };
  }

  if (!collections?.length) {
    return { ok: true, collections: [] };
  }

  const quoteIds = [...new Set(collections.map((row) => row.quote_id))];

  const { data: quotes, error: quotesError } = await supabase
    .from("quotes")
    .select(QUOTE_FIELDS)
    .in("id", quoteIds);

  if (quotesError) {
    return { ok: false, error: quotesError.message, collections: [] };
  }

  const quotesById = Object.fromEntries((quotes ?? []).map((q) => [q.id, q]));

  const merged = collections
    .map((row) => ({ ...row, quotes: quotesById[row.quote_id] ?? null }))
    .filter((row) => row.quotes);

  if (collections.length > 0 && merged.length === 0) {
    return {
      ok: false,
      error:
        "Masz zapisane cytaty, ale aplikacja nie może odczytać tabeli quotes. Uruchom Docs/supabase-quotes-read.sql w Supabase SQL Editor.",
      collections: [],
    };
  }

  return { ok: true, collections: merged };
}

export async function flagQuote(quoteId) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const profileResult = await ensureProfile(supabase, user.id);
  if (!profileResult.ok) {
    return profileResult;
  }

  const { error } = await supabase.from("quote_flags").insert({
    user_id: user.id,
    quote_id: quoteId,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: true };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function saveThread({
  quoteAId,
  quoteBId,
  type,
  glosa,
  axis = null,
}) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const profileResult = await ensureProfile(supabase, user.id);
  if (!profileResult.ok) {
    return profileResult;
  }

  const { data, error } = await supabase
    .from("nici")
    .insert({
      user_id: user.id,
      quote_a_id: quoteAId,
      quote_b_id: quoteBId,
      type,
      glosa,
      axis,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, threadId: data.id };
}

export async function fetchConstellationData() {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const [collectionsResult, niciRes] = await Promise.all([
    fetchCollectionsWithQuotes(supabase, user.id, { ascending: true }),
    supabase
      .from("nici")
      .select("id, quote_a_id, quote_b_id, type, glosa, axis, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!collectionsResult.ok) {
    return { ok: false, error: collectionsResult.error };
  }

  const niciWarning = niciRes.error?.message ?? null;

  return {
    ok: true,
    collections: collectionsResult.collections,
    nici: niciRes.data ?? [],
    warning: niciWarning,
  };
}

export async function fetchZielnikData() {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const [collectionsResult, marginsRes, niciRes] = await Promise.all([
    fetchCollectionsWithQuotes(supabase, user.id, { ascending: false }),
    supabase
      .from("margins")
      .select("quote_id, body, visibility")
      .eq("user_id", user.id),
    supabase
      .from("nici")
      .select("id, quote_a_id, quote_b_id, type, glosa, axis")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!collectionsResult.ok) {
    return { ok: false, error: collectionsResult.error };
  }

  const marginsByQuote = {};
  let warning = null;

  if (marginsRes.error) {
    warning = marginsRes.error.message;
  } else {
    (marginsRes.data ?? []).forEach((row) => {
      marginsByQuote[row.quote_id] = row;
    });
  }

  if (niciRes.error) {
    warning = warning
      ? `${warning} · ${niciRes.error.message}`
      : niciRes.error.message;
  }

  return {
    ok: true,
    collections: collectionsResult.collections,
    marginsByQuote,
    nici: niciRes.data ?? [],
    warning,
  };
}
