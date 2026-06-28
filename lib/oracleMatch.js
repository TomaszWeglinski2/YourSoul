import {
  computeTarget,
  parseAxes,
  vectorDistance,
} from "@/lib/journeyMath";

function normalizeExcludeIds(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map(Number).filter((id) => Number.isFinite(id));
}

export async function findNearestQuote(supabase, odcisk, nastroj, excludeIds) {
  const target = computeTarget(odcisk, nastroj);
  const excluded = normalizeExcludeIds(excludeIds);

  const rpcResult = await supabase.rpc("oracle_match_quote", {
    target_axes: target,
    exclude_ids: excluded,
  });

  if (!rpcResult.error && rpcResult.data?.length) {
    const row = rpcResult.data[0];
    return {
      id: row.id,
      text: row.text,
      author: row.author,
      work: row.work,
      axes: parseAxes(row.axes),
      distance: row.distance ?? null,
    };
  }

  return findNearestQuoteFallback(supabase, target, excluded, rpcResult.error);
}

async function findNearestQuoteFallback(supabase, target, excluded, rpcError) {
  let query = supabase
    .from("quotes")
    .select("id, text, author, work, axes")
    .eq("status", "active");

  if (excluded.length > 0) {
    query = query.not("id", "in", `(${excluded.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    const hint = rpcError?.message
      ? `RPC: ${rpcError.message}. Fallback: ${error.message}`
      : error.message;
    throw new Error(hint);
  }

  if (!data?.length) {
    return null;
  }

  let best = null;
  let bestDistance = Infinity;

  for (const row of data) {
    const axes = parseAxes(row.axes);
    const distance = vectorDistance(target, axes);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = {
        id: row.id,
        text: row.text,
        author: row.author,
        work: row.work,
        axes,
        distance: bestDistance,
      };
    }
  }

  return best;
}

export async function pickRandomGlosa(supabase, quoteId) {
  const { data, error } = await supabase
    .from("quote_glosses")
    .select("glosa")
    .eq("quote_id", quoteId);

  if (error || !data?.length) {
    return null;
  }

  const index = Math.floor(Math.random() * data.length);
  return data[index].glosa;
}
