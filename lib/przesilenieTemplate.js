import { AXES } from "@/lib/journeyConstants";
import { pickPrzesilenie, pickRandom } from "@/lib/constellationData";

export function normalizeTemplateRow(row) {
  const beats = Array.isArray(row.beats) ? row.beats : [];
  const a = row.value_a ?? "";
  const b = row.value_b ?? "";

  return {
    id: row.id ?? null,
    axis: row.axis,
    name: `${a} ↔ ${b}`,
    a,
    b,
    choiceA: row.choice_a ?? `Ocal ${a}`,
    choiceB: row.choice_b ?? `Ocal ${b}`,
    beats,
    pointa: row.pointa ?? "",
    axisLabel: AXES[row.axis] ?? "",
    variant: row.variant ?? 1,
    source: "database",
  };
}

function normalizeHardcoded(item) {
  return {
    id: null,
    axis: item.axis,
    name: item.name,
    a: item.a,
    b: item.b,
    choiceA: `Ocal ${item.a}`,
    choiceB: `Ocal ${item.b}`,
    beats: item.beats,
    pointa: item.pointa,
    axisLabel: AXES[item.axis] ?? "",
    variant: null,
    source: "fallback",
  };
}

export async function fetchRandomPrzesilenieScenario(supabase, axis) {
  if (axis < 0 || axis > 4) {
    return { ok: false, error: "Nieprawidłowa oś przesilenia." };
  }

  const { data, error } = await supabase
    .from("przesilenie_templates")
    .select(
      "id, axis, value_a, value_b, beats, choice_a, choice_b, pointa, variant"
    )
    .eq("axis", axis);

  if (error) {
    const fallback = pickPrzesilenie(axis);
    return {
      ok: true,
      scenario: normalizeHardcoded(fallback),
      warning: error.message,
    };
  }

  if (data?.length) {
    return {
      ok: true,
      scenario: normalizeTemplateRow(pickRandom(data)),
    };
  }

  const fallback = pickPrzesilenie(axis);
  return {
    ok: true,
    scenario: normalizeHardcoded(fallback),
    warning: "Brak szablonów w bazie — użyto wbudowanego scenariusza.",
  };
}
