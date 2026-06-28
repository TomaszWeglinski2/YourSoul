import {
  cellText,
  normalizeRow,
  parseAxisIndex,
  parseIntId,
  parseQuoteIds,
  parseAxesFromDb,
} from "@/lib/adminXlsx";
import { axisLabel } from "@/lib/adminCalibrationAnchors";

export function validateGlossRows(rows) {
  const valid = [];
  const skipped = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const data = normalizeRow(row);
    const text = cellText(data.text);

    if (!text) {
      skipped.push({ row: rowNum, reason: "Brak text" });
      return;
    }

    const idResult = parseIntId(data.quote_id, rowNum, "quote_id");
    if (idResult.error) {
      errors.push({ row: rowNum, message: idResult.error });
      return;
    }

    valid.push({
      row: rowNum,
      quote_id: idResult.value,
      angle: cellText(data.angle) || null,
      glosa: text,
    });
  });

  return { valid, skipped, errors };
}

export async function importGlossesToDb(supabase, validRows) {
  let added = 0;
  const errors = [];

  for (const item of validRows) {
    const payload = {
      quote_id: item.quote_id,
      glosa: item.glosa,
    };
    if (item.angle) {
      payload.angle = item.angle;
    }

    const { error } = await supabase.from("quote_glosses").insert(payload);

    if (error) {
      if (item.angle && error.message.includes("angle")) {
        const { error: retryError } = await supabase.from("quote_glosses").insert({
          quote_id: item.quote_id,
          glosa: item.glosa,
        });
        if (retryError) {
          errors.push({ row: item.row, message: retryError.message });
          continue;
        }
      } else {
        errors.push({ row: item.row, message: error.message });
        continue;
      }
    }

    added += 1;
  }

  return { added, errors };
}

export function validateTowerRows(rows) {
  const valid = [];
  const skipped = [];
  const errors = [];
  const warnings = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const data = normalizeRow(row);
    const meta = cellText(data.meta_gloss);

    if (!meta) {
      skipped.push({ row: rowNum, reason: "Brak meta_gloss" });
      return;
    }

    const axisResult = parseAxisIndex(data.axis, rowNum);
    if (axisResult.error) {
      errors.push({ row: rowNum, message: axisResult.error });
      return;
    }

    const idsResult = parseQuoteIds(data.quote_ids, rowNum);
    if (idsResult.error) {
      errors.push({ row: rowNum, message: idsResult.error });
      return;
    }

    const variantRaw = cellText(data.variant);
    const variant = variantRaw ? parseInt(variantRaw, 10) : 1;

    valid.push({
      row: rowNum,
      axis: axisResult.value,
      quote_ids: idsResult.value,
      meta_gloss: meta,
      variant: Number.isNaN(variant) ? 1 : variant,
    });
  });

  return { valid, skipped, errors, warnings };
}

export async function checkTowerAxisSpan(supabase, axis, quoteIds) {
  const { data: quotes, error } = await supabase
    .from("quotes")
    .select("id, axes")
    .in("id", quoteIds);

  if (error || !quotes?.length) {
    return { ok: false, message: "Nie udało się odczytać osi cytatów." };
  }

  let min = 9;
  let max = -9;
  quotes.forEach((quote) => {
    const axes = parseAxesFromDb(quote.axes);
    const value = axes[axis] ?? 0;
    min = Math.min(min, value);
    max = Math.max(max, value);
  });

  if (min > -0.4 || max < 0.4) {
    return {
      ok: false,
      message: `Oś ${axisLabel(axis)}: brak przeciwległych biegunów (min=${min.toFixed(2)}, max=${max.toFixed(2)}; oczekiwano min≤−0.4 i max≥+0.4).`,
    };
  }

  return { ok: true };
}

export async function importTowersToDb(supabase, validRows) {
  let added = 0;
  const errors = [];
  const warnings = [];

  for (const item of validRows) {
    const span = await checkTowerAxisSpan(supabase, item.axis, item.quote_ids);
    if (!span.ok) {
      warnings.push({ row: item.row, message: span.message });
    }

    const { error } = await supabase.from("towers").insert({
      axis: item.axis,
      quote_ids: item.quote_ids,
      meta_gloss: item.meta_gloss,
      variant: item.variant,
    });

    if (error) {
      errors.push({ row: item.row, message: error.message });
      continue;
    }

    added += 1;
  }

  return { added, errors, warnings };
}

export function validatePrzesilenieRows(rows) {
  const valid = [];
  const skipped = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const data = normalizeRow(row);

    const axisResult = parseAxisIndex(data.axis, rowNum);
    if (axisResult.error) {
      errors.push({ row: rowNum, message: axisResult.error });
      return;
    }

    const valueA = cellText(data.value_a);
    const valueB = cellText(data.value_b);
    const takt1 = cellText(data.takt1);
    const takt2 = cellText(data.takt2);
    const choiceA = cellText(data.choice_a);
    const choiceB = cellText(data.choice_b);
    const pointa = cellText(data.pointa);

    if (!valueA || !valueB || !takt1 || !takt2 || !choiceA || !choiceB || !pointa) {
      skipped.push({ row: rowNum, reason: "Brak wymaganego pola" });
      return;
    }

    const variantRaw = cellText(data.variant);
    const variant = variantRaw ? parseInt(variantRaw, 10) : 1;
    const axisName = axisLabel(axisResult.value);

    valid.push({
      row: rowNum,
      axis: axisResult.value,
      value_a: valueA,
      value_b: valueB,
      choice_a: choiceA,
      choice_b: choiceB,
      pointa,
      variant: Number.isNaN(variant) ? 1 : variant,
      beats: [
        {
          kick: `Przesilenie — ${axisName}`,
          txt: takt1,
          btn: "Dalej",
        },
        {
          kick: "Nie ma dobrej opcji",
          txt: takt2,
          btn: "Stoisz na rozłamie",
        },
      ],
    });
  });

  return { valid, skipped, errors };
}

export async function importPrzesilenieToDb(supabase, validRows) {
  let added = 0;
  const errors = [];

  for (const item of validRows) {
    const { error } = await supabase.from("przesilenie_templates").insert({
      axis: item.axis,
      value_a: item.value_a,
      value_b: item.value_b,
      beats: item.beats,
      choice_a: item.choice_a,
      choice_b: item.choice_b,
      pointa: item.pointa,
      variant: item.variant,
    });

    if (error) {
      errors.push({ row: item.row, message: error.message });
      continue;
    }

    added += 1;
  }

  return { added, errors };
}

export function validateCienRows(rows) {
  const valid = [];
  const skipped = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const data = normalizeRow(row);
    const cien = cellText(data.cien);

    if (!cien) {
      skipped.push({ row: rowNum, reason: "Brak cien" });
      return;
    }

    const idResult = parseIntId(data.quote_id, rowNum, "quote_id");
    if (idResult.error) {
      errors.push({ row: rowNum, message: idResult.error });
      return;
    }

    valid.push({
      row: rowNum,
      quote_id: idResult.value,
      cien,
    });
  });

  return { valid, skipped, errors };
}

export async function importCienieToDb(supabase, validRows) {
  let added = 0;
  const errors = [];

  for (const item of validRows) {
    const { error } = await supabase
      .from("quotes")
      .update({ cien: item.cien })
      .eq("id", item.quote_id);

    if (error) {
      errors.push({ row: item.row, message: error.message });
      continue;
    }

    added += 1;
  }

  return { added, errors };
}
