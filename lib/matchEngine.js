/** Etykieta anonimowa — ten sam format co w Wyroczni. */
export function anonymousLabel(userId) {
  return `Podróżnik ·${String(userId).slice(-4)}`;
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
