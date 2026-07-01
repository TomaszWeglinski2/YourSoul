import { AXIS_KEYS, EXPECTED_COLUMNS } from "@/lib/importQuotes";

/** Kolumny importu cytatów (bez id). */
export const QUOTE_IMPORT_COLUMNS = EXPECTED_COLUMNS;

/** Kolumny eksportu cytatów — id na początku do powiązań i re-importu. */
export const QUOTE_EXPORT_COLUMNS = ["id", ...EXPECTED_COLUMNS];

export const GLOSS_COLUMNS = ["quote_id", "angle", "text"];

export const CIEN_COLUMNS = ["quote_id", "cien"];

export const TOWER_COLUMNS = ["axis", "quote_ids", "meta_gloss", "variant"];

export const PRZESILENIE_COLUMNS = [
  "axis",
  "value_a",
  "value_b",
  "takt1",
  "takt2",
  "choice_a",
  "choice_b",
  "pointa",
  "variant",
];

/** Lekki eksport pod prompt AI (cienie, Wieże). */
export const QUOTE_AXES_PROMPT_COLUMNS = [
  "id",
  "author",
  "text",
  ...AXIS_KEYS,
];

export const EXPORT_TYPES = new Set([
  "quotes",
  "glosses",
  "towers",
  "przesilenie",
  "cienie",
  "quotes-axes-prompt",
]);

export function exportTypeLabel(type) {
  const labels = {
    quotes: "cytaty",
    glosses: "glosy",
    towers: "wieze",
    przesilenie: "przesilenia",
    cienie: "cienie",
    "quotes-axes-prompt": "cytaty-osie",
  };
  return labels[type] ?? type;
}

export function buildExportFilename(type, filters = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const base = `your-soul-${exportTypeLabel(type)}-${date}`;
  const parts = [base];

  if (filters.unverifiedOnly) {
    parts.push("nieweryfikowane");
  }
  if (filters.domain) {
    parts.push(String(filters.domain).replace(/\s+/g, "-").slice(0, 24));
  }
  if (filters.createdAfter) {
    parts.push(`od-${String(filters.createdAfter).slice(0, 10)}`);
  }

  return `${parts.join("-")}.xlsx`;
}
