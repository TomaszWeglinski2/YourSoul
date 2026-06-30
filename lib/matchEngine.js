/** Etykieta anonimowa drugiej osoby (nie Ty). */
export function anonymousLabel(userId) {
  return `Podróżnik ·${String(userId).slice(-4).toUpperCase()}`;
}

/** Krótka wskazówka — odróżnia Twoje konto od dopasowań. */
export function myAnonymousSuffix(myUserId) {
  if (!myUserId) return null;
  return `·${String(myUserId).slice(-4).toUpperCase()}`;
}

export function peerIdentityHint(myUserId) {
  const suffix = myAnonymousSuffix(myUserId);
  if (!suffix) return null;
  return `Ty masz znak ${suffix} w nagłówku — poniżej to zawsze ktoś inny.`;
}

export function matchTag({
  mode,
  rank,
  idfScore,
  myOdcisk,
  matchedOdcisk,
}) {
  if (mode === "like_me") {
    if (rank === 1) return "Lustro";
    return "Bliskie echo";
  }

  if (
    myOdcisk?.length === 5 &&
    matchedOdcisk?.length === 5 &&
    myOdcisk[4] * matchedOdcisk[4] < 0
  ) {
    return "Dopełnienie — napięcie";
  }

  if (idfScore > 1.5) {
    return "Dopełnienie — wspólne nici";
  }

  return "Dopełnienie — inny świat";
}

export const MATCH_MODES = [
  { id: "like_me", label: "Ktoś jak ja" },
  { id: "different", label: "Ktoś inny" },
];
