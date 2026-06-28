import {
  cellText,
  normalizeRow,
  parseBool,
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

export async function importQuotesToDb(supabase, validRows) {
  let added = 0;
  const errors = [];

  for (const item of validRows) {
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

    if (item.glosa) {
      const { error: glosaError } = await supabase.from("quote_glosses").insert({
        quote_id: quote.id,
        glosa: item.glosa,
      });

      if (glosaError) {
        errors.push({
          row: item.row,
          message: `Cytat zapisany (id ${quote.id}), ale glosa nie: ${glosaError.message}`,
        });
        added += 1;
        continue;
      }
    }

    added += 1;
  }

  return { added, errors };
}
