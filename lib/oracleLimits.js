/** Strefa „dzisiaj" dla limitu wróżb — łatwa do zmiany w jednym miejscu. */
export const ORACLE_TIMEZONE = "Europe/Warsaw";

/** Domyślny limit (Free) — gdy brak planów w profilu. */
export const ORACLE_DAILY_LIMIT_DEFAULT = 3;

/** Limit PRO — używany, gdy w profilu pojawi się plan pro. */
export const ORACLE_DAILY_LIMIT_PRO = 10;

/**
 * Dzienny limit wróżb dla użytkownika.
 * @param {object|null} profile — wiersz profiles (opcjonalnie plan / tier)
 */
export function resolveOracleDailyLimit(profile) {
  const plan = profile?.plan ?? profile?.subscription_plan ?? null;
  if (plan === "pro" || plan === "PRO") {
    return ORACLE_DAILY_LIMIT_PRO;
  }
  return ORACLE_DAILY_LIMIT_DEFAULT;
}

export function formatOracleNavBadge(remaining) {
  if (remaining <= 0) {
    return "· jutro";
  }
  const circled = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];
  if (remaining >= 0 && remaining <= 10) {
    return circled[remaining];
  }
  return String(remaining);
}

export function oracleDrawsWord(count) {
  if (count === 1) {
    return "wróżba";
  }
  if (count >= 2 && count <= 4) {
    return "wróżby";
  }
  return "wróżb";
}
