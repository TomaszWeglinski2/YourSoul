import { axisLabel } from "@/lib/adminCalibrationAnchors";

export async function listGlosses(supabase) {
  const { data, error } = await supabase
    .from("quote_glosses")
    .select("id, quote_id, glosa, angle, created_at, quotes(text, author)")
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    return { ok: false, error: error.message, items: [] };
  }

  return { ok: true, items: data ?? [] };
}

export async function listTowers(supabase) {
  const { data, error } = await supabase
    .from("towers")
    .select("id, axis, quote_ids, meta_gloss, variant, created_at")
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    return { ok: false, error: error.message, items: [] };
  }

  return {
    ok: true,
    items: (data ?? []).map((row) => ({
      ...row,
      axisLabel: axisLabel(row.axis),
    })),
  };
}

export async function listPrzesilenieTemplates(supabase) {
  const { data, error } = await supabase
    .from("przesilenie_templates")
    .select(
      "id, axis, value_a, value_b, beats, choice_a, choice_b, pointa, variant, created_at"
    )
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    return { ok: false, error: error.message, items: [] };
  }

  return {
    ok: true,
    items: (data ?? []).map((row) => ({
      ...row,
      axisLabel: axisLabel(row.axis),
      beatCount: Array.isArray(row.beats) ? row.beats.length : 0,
    })),
  };
}

export async function listCienie(supabase) {
  const { data, error } = await supabase
    .from("quotes")
    .select("id, text, author, cien, created_at")
    .not("cien", "is", null)
    .neq("cien", "")
    .order("id", { ascending: false })
    .limit(100);

  if (error) {
    return { ok: false, error: error.message, items: [] };
  }

  return { ok: true, items: data ?? [] };
}
