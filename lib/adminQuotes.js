import { parseAxesFromDb } from "@/lib/adminXlsx";

export async function listQuotesForAdmin(supabase, { limit = 80, search = "" } = {}) {
  let query = supabase
    .from("quotes")
    .select("id, text, author, work, axes, source_verified, quality, status")
    .eq("status", "active")
    .order("id", { ascending: false })
    .limit(limit);

  if (search.trim()) {
    query = query.ilike("text", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error) {
    return { ok: false, error: error.message, quotes: [] };
  }

  return {
    ok: true,
    quotes: (data ?? []).map((row) => ({
      ...row,
      axes: parseAxesFromDb(row.axes),
    })),
  };
}

export async function updateQuoteAxes(
  supabase,
  { id, axes, source_verified }
) {
  const payload = { axes };
  if (typeof source_verified === "boolean") {
    payload.source_verified = source_verified;
  }

  const { error } = await supabase.from("quotes").update(payload).eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function listQualityReport(supabase) {
  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("id, text, author, quality, status")
    .neq("status", "hidden")
    .order("quality", { ascending: true })
    .limit(200);

  if (error) {
    return { ok: false, error: error.message, rows: [] };
  }

  const ids = (quotes ?? []).map((q) => q.id);
  let flagCounts = {};

  if (ids.length) {
    const { data: flags } = await supabase
      .from("quote_flags")
      .select("quote_id")
      .in("quote_id", ids);

    (flags ?? []).forEach((row) => {
      flagCounts[row.quote_id] = (flagCounts[row.quote_id] ?? 0) + 1;
    });
  }

  const rows = (quotes ?? []).map((quote, index) => ({
    ...quote,
    flagCount: flagCounts[quote.id] ?? 0,
    isCandidate: index < 4 || (flagCounts[quote.id] ?? 0) > 0,
  }));

  return { ok: true, rows };
}

export async function hideQuote(supabase, quoteId) {
  const { error } = await supabase
    .from("quotes")
    .update({ status: "hidden" })
    .eq("id", quoteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
