import {
  cellText,
  normalizeRow,
  parseBool,
  parseIntId,
} from "@/lib/adminXlsx";

export const AXIS_KEYS = [
  "sens",
  "zachwyt",
  "wspolnota",
  "tajemnica",
  "prowokacja",
];

export const EXPECTED_COLUMNS = [
  "text",
  "author",
  "work",
  "year",
  "rights",
  "dom",
  ...AXIS_KEYS,
  "glosa",
  "source_verified",
];

function parseAxis(value, axisName, rowNum) {
  if (value === "" || value === null || value === undefined) {
    return {
      error: `Wiersz ${rowNum}: brak wartości osi „${axisName}".`,
    };
  }

  const num = typeof value === "number" ? value : parseFloat(String(value).replace(",", "."));

  if (Number.isNaN(num)) {
    return {
      error: `Wiersz ${rowNum}: oś „${axisName}" nie jest liczbą (${value}).`,
    };
  }

  if (num < -1 || num > 1) {
    return {
      error: `Wiersz ${rowNum}: oś „${axisName}" = ${num} — poza zakresem −1..1.`,
    };
  }

  return { value: num };
}

function parseDomains(domValue) {
  const raw = cellText(domValue);
  if (!raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseYear(value) {
  const raw = cellText(value);
  if (!raw) return null;
  const num = parseInt(raw, 10);
  return Number.isNaN(num) ? raw : num;
}

function normalizeOptional(value) {
  const raw = cellText(value);
  return raw || null;
}

function parseOptionalQuoteId(data, rowNum) {
  const raw = cellText(data.id);
  if (!raw) {
    return { value: null };
  }

  const result = parseIntId(raw, rowNum, "id");
  if (result.error) {
    return result;
  }

  return { value: result.value };
}

export function validateQuoteRows(rows) {
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

    const idResult = parseOptionalQuoteId(data, rowNum);
    if (idResult.error) {
      errors.push({ row: rowNum, message: idResult.error });
      return;
    }

    const axes = [];
    let axisError = null;

    for (const key of AXIS_KEYS) {
      const result = parseAxis(data[key], key, rowNum);
      if (result.error) {
        axisError = result.error;
        break;
      }
      axes.push(result.value);
    }

    if (axisError) {
      errors.push({ row: rowNum, message: axisError });
      return;
    }

    valid.push({
      row: rowNum,
      id: idResult.value,
      quote: {
        text,
        author: normalizeOptional(data.author),
        work: normalizeOptional(data.work),
        year: parseYear(data.year),
        rights: normalizeOptional(data.rights),
        axes,
        domains: parseDomains(data.dom),
        source_verified: parseBool(data.source_verified),
      },
      glosa: normalizeOptional(data.glosa),
    });
  });

  return { valid, skipped, errors };
}

async function findExistingQuoteId(supabase, text, author) {
  let query = supabase.from("quotes").select("id").eq("text", text);

  if (author) {
    query = query.eq("author", author);
  } else {
    query = query.is("author", null);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    return { error: error.message, id: null };
  }

  return { id: data?.id ?? null };
}

async function upsertPrimaryGlosa(supabase, quoteId, glosaText) {
  if (!glosaText) {
    return { ok: true };
  }

  const { data: existing, error: readError } = await supabase
    .from("quote_glosses")
    .select("id")
    .eq("quote_id", quoteId)
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (existing?.id) {
    const { error } = await supabase
      .from("quote_glosses")
      .update({ glosa: glosaText })
      .eq("id", existing.id);

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  }

  const { error } = await supabase.from("quote_glosses").insert({
    quote_id: quoteId,
    glosa: glosaText,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function importQuotesToDb(supabase, validRows) {
  let added = 0;
  let updated = 0;
  const errors = [];

  for (const item of validRows) {
    let quoteId = item.id;
    let mode = "insert";

    if (quoteId) {
      const { data: byId, error: byIdError } = await supabase
        .from("quotes")
        .select("id")
        .eq("id", quoteId)
        .maybeSingle();

      if (byIdError) {
        errors.push({
          row: item.row,
          message: `Błąd wyszukiwania id ${quoteId}: ${byIdError.message}`,
        });
        continue;
      }

      if (!byId) {
        errors.push({
          row: item.row,
          message: `Nie znaleziono cytatu o id ${quoteId}.`,
        });
        continue;
      }

      mode = "update";
    } else {
      const match = await findExistingQuoteId(
        supabase,
        item.quote.text,
        item.quote.author
      );

      if (match.error) {
        errors.push({
          row: item.row,
          message: `Błąd deduplikacji: ${match.error}`,
        });
        continue;
      }

      if (match.id) {
        quoteId = match.id;
        mode = "update";
      }
    }

    if (mode === "update") {
      const { error: updateError } = await supabase
        .from("quotes")
        .update(item.quote)
        .eq("id", quoteId);

      if (updateError) {
        errors.push({
          row: item.row,
          message: `Błąd aktualizacji cytatu id ${quoteId}: ${updateError.message}`,
        });
        continue;
      }

      const glosaResult = await upsertPrimaryGlosa(
        supabase,
        quoteId,
        item.glosa
      );

      if (!glosaResult.ok) {
        errors.push({
          row: item.row,
          message: `Cytat zaktualizowany (id ${quoteId}), ale glosa nie: ${glosaResult.error}`,
        });
        updated += 1;
        continue;
      }

      updated += 1;
      continue;
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .insert(item.quote)
      .select("id")
      .single();

    if (quoteError) {
      errors.push({
        row: item.row,
        message: `Błąd zapisu cytatu: ${quoteError.message}`,
      });
      continue;
    }

    const glosaResult = await upsertPrimaryGlosa(
      supabase,
      quote.id,
      item.glosa
    );

    if (!glosaResult.ok) {
      errors.push({
        row: item.row,
        message: `Cytat zapisany (id ${quote.id}), ale glosa nie: ${glosaResult.error}`,
      });
      added += 1;
      continue;
    }

    added += 1;
  }

  return { added, updated, errors };
}
