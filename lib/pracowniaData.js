import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const SQL_DOC = "Docs/supabase-pracownia.sql";

function sqlHint(error, rpcName) {
  const msg = error?.message ?? "";
  if (
    msg.includes("relation") ||
    msg.includes("does not exist") ||
    msg.includes(rpcName)
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

async function syncNoteShares(supabase, noteId, visibility, shareUserIds) {
  await supabase.from("note_shares").delete().eq("note_id", noteId);

  if (visibility !== "shared" || !shareUserIds?.length) {
    return { ok: true };
  }

  const rows = [...new Set(shareUserIds)].map((targetUserId) => ({
    note_id: noteId,
    target_user_id: targetUserId,
  }));

  const { error } = await supabase.from("note_shares").insert(rows);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function searchTravelerNicks(query) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError, results: [] };
  }

  const { data, error } = await supabase.rpc("search_traveler_nicks", {
    p_query: query.trim(),
    p_limit: 8,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "search_traveler_nicks")}`,
      results: [],
    };
  }

  return { ok: true, results: data ?? [] };
}

export async function fetchNoteShareNicks(noteId) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError, shares: [] };
  }

  const { data, error } = await supabase.rpc("get_note_share_nicks", {
    p_note_id: noteId,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "get_note_share_nicks")}`,
      shares: [],
    };
  }

  return { ok: true, shares: data ?? [] };
}

export async function fetchMyNotes() {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError, notes: [] };
  }

  const { data, error } = await supabase
    .from("notes")
    .select("id, title, body, visibility, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "notes")}`,
      notes: [],
    };
  }

  return { ok: true, notes: data ?? [] };
}

export async function createNote({ title, body, visibility, shareUserIds }) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const trimmedBody = body?.trim();
  if (!trimmedBody) {
    return { ok: false, error: "Treść notatki jest wymagana." };
  }

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: user.id,
      title: title?.trim() || null,
      body: trimmedBody,
      visibility: visibility ?? "private",
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "notes")}`,
    };
  }

  const shareResult = await syncNoteShares(
    supabase,
    data.id,
    visibility,
    shareUserIds
  );

  if (!shareResult.ok) {
    return shareResult;
  }

  return { ok: true, id: data.id };
}

export async function updateNote({
  id,
  title,
  body,
  visibility,
  shareUserIds,
}) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const trimmedBody = body?.trim();
  if (!trimmedBody) {
    return { ok: false, error: "Treść notatki jest wymagana." };
  }

  const { error } = await supabase
    .from("notes")
    .update({
      title: title?.trim() || null,
      body: trimmedBody,
      visibility: visibility ?? "private",
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "notes")}`,
    };
  }

  return syncNoteShares(supabase, id, visibility, shareUserIds);
}

export async function deleteNote(id) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const { error } = await supabase
    .from("notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "notes")}`,
    };
  }

  return { ok: true };
}

export async function fetchMyUserQuotes() {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError, quotes: [] };
  }

  const { data, error } = await supabase
    .from("user_quotes")
    .select("id, text, author, source, kind, visibility, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "user_quotes")}`,
      quotes: [],
    };
  }

  return { ok: true, quotes: data ?? [] };
}

export async function createUserQuote({
  text,
  author,
  source,
  kind,
  visibility,
}) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const trimmedText = text?.trim();
  if (!trimmedText) {
    return { ok: false, error: "Treść cytatu jest wymagana." };
  }

  const quoteKind = kind === "own" ? "own" : "found";

  const { data, error } = await supabase
    .from("user_quotes")
    .insert({
      user_id: user.id,
      text: trimmedText,
      author: quoteKind === "found" ? author?.trim() || null : null,
      source: quoteKind === "found" ? source?.trim() || null : null,
      kind: quoteKind,
      visibility: visibility ?? "private",
    })
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "user_quotes")}`,
    };
  }

  return { ok: true, id: data.id };
}

export async function updateUserQuote({
  id,
  text,
  author,
  source,
  kind,
  visibility,
}) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const trimmedText = text?.trim();
  if (!trimmedText) {
    return { ok: false, error: "Treść cytatu jest wymagana." };
  }

  const quoteKind = kind === "own" ? "own" : "found";

  const { error } = await supabase
    .from("user_quotes")
    .update({
      text: trimmedText,
      author: quoteKind === "found" ? author?.trim() || null : null,
      source: quoteKind === "found" ? source?.trim() || null : null,
      kind: quoteKind,
      visibility: visibility ?? "private",
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "user_quotes")}`,
    };
  }

  return { ok: true };
}

export async function deleteUserQuote(id) {
  const supabase = getSupabaseBrowserClient();
  const { user, error: authError } = await getCurrentUser(supabase);

  if (!user) {
    return { ok: false, error: authError };
  }

  const { error } = await supabase
    .from("user_quotes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "user_quotes")}`,
    };
  }

  return { ok: true };
}

export async function fetchPublicConstellation(nick) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("get_public_constellation", {
    p_nick: nick,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "get_public_constellation")}`,
      constellation: null,
    };
  }

  if (!data) {
    return { ok: false, error: "Nie znaleziono podróżnika o tym nicku.", constellation: null };
  }

  return { ok: true, constellation: data };
}
