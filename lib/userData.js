import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export async function upsertProfile({ worlds, odcisk }) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { error } = await supabase.from("collections").upsert(
    {
      user_id: user.id,
      quote_id: quoteId,
    },
    { onConflict: "user_id,quote_id", ignoreDuplicates: true }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function saveMargin({ quoteId, body, visibility }) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
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
