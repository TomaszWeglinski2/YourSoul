import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Wyłącznie cytaty z korpusu — nigdy marginesy, konstelacja, przesilenia.
 */
export async function fetchPublicQuoteById(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const supabase = createSupabaseAdmin();
  const { data: quote, error } = await supabase
    .from("quotes")
    .select("id, text, author, work")
    .eq("id", id)
    .maybeSingle();

  if (error || !quote?.text) {
    return null;
  }

  const { data: glosses } = await supabase
    .from("quote_glosses")
    .select("glosa")
    .eq("quote_id", id)
    .limit(1);

  return {
    id: quote.id,
    text: quote.text,
    author: quote.author ?? "",
    work: quote.work ?? "",
    glosa: glosses?.[0]?.glosa ?? null,
  };
}

export function truncateText(text, maxLen = 160) {
  const normalized = String(text ?? "").trim();
  if (normalized.length <= maxLen) {
    return normalized;
  }
  return `${normalized.slice(0, maxLen - 1).trim()}…`;
}

export function teaserExcerpt(text, maxLen = 220) {
  return truncateText(text, maxLen);
}
