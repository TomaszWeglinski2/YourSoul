import { buildXlsxBuffer, parseAxesFromDb } from "@/lib/adminXlsx";
import {
  CIEN_COLUMNS,
  GLOSS_COLUMNS,
  PRZESILENIE_COLUMNS,
  QUOTE_AXES_PROMPT_COLUMNS,
  QUOTE_EXPORT_COLUMNS,
  TOWER_COLUMNS,
  buildExportFilename,
} from "@/lib/adminColumnFormats";

const PAGE_SIZE = 1000;

function formatDomains(domains) {
  if (!Array.isArray(domains)) {
    return "";
  }
  return domains.filter(Boolean).join(", ");
}

function formatQuoteIds(ids) {
  if (!Array.isArray(ids)) {
    return "";
  }
  return ids.join(",");
}

function beatsToTakts(beats) {
  const arr = Array.isArray(beats) ? beats : [];
  return {
    takt1: arr[0]?.txt ?? "",
    takt2: arr[1]?.txt ?? "",
  };
}

async function fetchPaged(queryFn) {
  const all = [];
  let from = 0;

  while (true) {
    const { data, error } = await queryFn(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(error.message);
    }
    if (!data?.length) {
      break;
    }
    all.push(...data);
    if (data.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }

  return all;
}

function buildQuotesQuery(supabase, filters = {}) {
  return (from, to) => {
    let query = supabase
      .from("quotes")
      .select(
        "id, text, author, work, year, rights, domains, axes, source_verified, created_at, cien"
      )
      .order("id", { ascending: true })
      .range(from, to);

    if (filters.unverifiedOnly) {
      query = query.eq("source_verified", false);
    }

    if (filters.domain?.trim()) {
      query = query.contains("domains", [filters.domain.trim()]);
    }

    if (filters.createdAfter) {
      const iso = new Date(filters.createdAfter).toISOString();
      query = query.gte("created_at", iso);
    }

    return query;
  };
}

async function fetchPrimaryGlosas(supabase, quoteIds) {
  const map = new Map();
  if (!quoteIds.length) {
    return map;
  }

  const chunks = [];
  for (let i = 0; i < quoteIds.length; i += PAGE_SIZE) {
    chunks.push(quoteIds.slice(i, i + PAGE_SIZE));
  }

  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from("quote_glosses")
      .select("quote_id, glosa")
      .in("quote_id", chunk)
      .order("id", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data ?? []) {
      if (!map.has(row.quote_id)) {
        map.set(row.quote_id, row.glosa ?? "");
      }
    }
  }

  return map;
}

function quoteToExportRow(quote, glosaMap) {
  const axes = parseAxesFromDb(quote.axes);
  return [
    quote.id,
    quote.text ?? "",
    quote.author ?? "",
    quote.work ?? "",
    quote.year ?? "",
    quote.rights ?? "",
    formatDomains(quote.domains),
    ...axes,
    glosaMap.get(quote.id) ?? "",
    Boolean(quote.source_verified),
  ];
}

export async function exportQuotesWorkbook(supabase, filters = {}) {
  const quotes = await fetchPaged(buildQuotesQuery(supabase, filters));
  const glosaMap = await fetchPrimaryGlosas(
    supabase,
    quotes.map((row) => row.id)
  );

  const rows = quotes.map((quote) => quoteToExportRow(quote, glosaMap));
  const buffer = buildXlsxBuffer(QUOTE_EXPORT_COLUMNS, rows, "cytaty");

  return {
    buffer,
    filename: buildExportFilename("quotes", filters),
    rowCount: rows.length,
  };
}

export async function exportQuotesAxesPromptWorkbook(supabase, filters = {}) {
  const quotes = await fetchPaged(buildQuotesQuery(supabase, filters));
  const rows = quotes.map((quote) => {
    const axes = parseAxesFromDb(quote.axes);
    return [quote.id, quote.author ?? "", quote.text ?? "", ...axes];
  });

  const buffer = buildXlsxBuffer(QUOTE_AXES_PROMPT_COLUMNS, rows, "cytaty-osie");

  return {
    buffer,
    filename: buildExportFilename("quotes-axes-prompt", filters),
    rowCount: rows.length,
  };
}

export async function exportGlossesWorkbook(supabase) {
  const glosses = await fetchPaged((from, to) =>
    supabase
      .from("quote_glosses")
      .select("quote_id, angle, glosa")
      .order("id", { ascending: true })
      .range(from, to)
  );

  const rows = glosses.map((row) => [
    row.quote_id,
    row.angle ?? "",
    row.glosa ?? "",
  ]);

  const buffer = buildXlsxBuffer(GLOSS_COLUMNS, rows, "glosy");

  return {
    buffer,
    filename: buildExportFilename("glosses"),
    rowCount: rows.length,
  };
}

export async function exportCienieWorkbook(supabase) {
  const quotes = await fetchPaged((from, to) =>
    supabase
      .from("quotes")
      .select("id, cien")
      .not("cien", "is", null)
      .neq("cien", "")
      .order("id", { ascending: true })
      .range(from, to)
  );

  const rows = quotes.map((row) => [row.id, row.cien ?? ""]);
  const buffer = buildXlsxBuffer(CIEN_COLUMNS, rows, "cienie");

  return {
    buffer,
    filename: buildExportFilename("cienie"),
    rowCount: rows.length,
  };
}

export async function exportTowersWorkbook(supabase) {
  const towers = await fetchPaged((from, to) =>
    supabase
      .from("towers")
      .select("axis, quote_ids, meta_gloss, variant")
      .order("id", { ascending: true })
      .range(from, to)
  );

  const rows = towers.map((row) => [
    row.axis,
    formatQuoteIds(row.quote_ids),
    row.meta_gloss ?? "",
    row.variant ?? 1,
  ]);

  const buffer = buildXlsxBuffer(TOWER_COLUMNS, rows, "wieze");

  return {
    buffer,
    filename: buildExportFilename("towers"),
    rowCount: rows.length,
  };
}

export async function exportPrzesilenieWorkbook(supabase) {
  const items = await fetchPaged((from, to) =>
    supabase
      .from("przesilenie_templates")
      .select(
        "axis, value_a, value_b, beats, choice_a, choice_b, pointa, variant"
      )
      .order("id", { ascending: true })
      .range(from, to)
  );

  const rows = items.map((row) => {
    const { takt1, takt2 } = beatsToTakts(row.beats);
    return [
      row.axis,
      row.value_a ?? "",
      row.value_b ?? "",
      takt1,
      takt2,
      row.choice_a ?? "",
      row.choice_b ?? "",
      row.pointa ?? "",
      row.variant ?? 1,
    ];
  });

  const buffer = buildXlsxBuffer(PRZESILENIE_COLUMNS, rows, "przesilenia");

  return {
    buffer,
    filename: buildExportFilename("przesilenie"),
    rowCount: rows.length,
  };
}

export async function buildAdminExport(supabase, type, filters = {}) {
  switch (type) {
    case "quotes":
      return exportQuotesWorkbook(supabase, filters);
    case "quotes-axes-prompt":
      return exportQuotesAxesPromptWorkbook(supabase, filters);
    case "glosses":
      return exportGlossesWorkbook(supabase);
    case "cienie":
      return exportCienieWorkbook(supabase);
    case "towers":
      return exportTowersWorkbook(supabase);
    case "przesilenie":
      return exportPrzesilenieWorkbook(supabase);
    default:
      return null;
  }
}
