export function buildQuoteSharePath(quoteId, inviteCode) {
  const id = Number(quoteId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  const params = new URLSearchParams();
  const code = String(inviteCode ?? "").trim().toUpperCase();
  if (code) {
    params.set("ref", code);
  }

  const query = params.toString();
  return query ? `/${id}?${query}` : `/${id}`;
}

export function buildQuoteShareUrl(quoteId, inviteCode, origin) {
  const path = buildQuoteSharePath(quoteId, inviteCode);
  if (!path) {
    return null;
  }
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}${path}`;
}

export function quoteCardImagePath(quoteId) {
  const id = Number(quoteId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return `/${id}/opengraph-image`;
}
