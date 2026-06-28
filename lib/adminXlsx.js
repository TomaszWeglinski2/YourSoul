import * as XLSX from "xlsx";

export function parseXlsxRows(buffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { error: "Plik nie zawiera arkuszy." };
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    defval: "",
  });

  return { rows, sheetName };
}

export function buildXlsxBuffer(headers, dataRows, sheetName = "Arkusz1") {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function normalizeKey(key) {
  return String(key ?? "")
    .trim()
    .toLowerCase();
}

export function normalizeRow(row) {
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
}

export function cellText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function parseBool(value) {
  const raw = cellText(value).toLowerCase();
  if (!raw) return false;
  return ["1", "true", "tak", "yes", "y"].includes(raw);
}

export function parseIntId(value, rowNum, fieldName) {
  const raw = cellText(value);
  if (!raw) {
    return { error: `Wiersz ${rowNum}: brak ${fieldName}.` };
  }
  const num = parseInt(raw, 10);
  if (Number.isNaN(num)) {
    return { error: `Wiersz ${rowNum}: ${fieldName} nie jest liczbą (${value}).` };
  }
  return { value: num };
}

export function parseQuoteIds(value, rowNum) {
  const raw = cellText(value);
  if (!raw) {
    return { error: `Wiersz ${rowNum}: brak quote_ids.` };
  }
  const ids = raw
    .split(/[,;\s]+/)
    .map((part) => parseInt(part.trim(), 10))
    .filter((n) => !Number.isNaN(n));

  if (ids.length < 3) {
    return {
      error: `Wiersz ${rowNum}: quote_ids wymaga co najmniej 3 id (otrzymano: ${raw}).`,
    };
  }

  return { value: ids };
}

export function parseAxisIndex(value, rowNum) {
  const raw = cellText(value);
  if (raw === "") {
    return { error: `Wiersz ${rowNum}: brak axis.` };
  }
  const num = parseInt(raw, 10);
  if (Number.isNaN(num) || num < 0 || num > 4) {
    return { error: `Wiersz ${rowNum}: axis musi być 0–4 (${value}).` };
  }
  return { value: num };
}

export function parseAxesFromDb(raw) {
  if (Array.isArray(raw)) {
    return raw.map(Number);
  }
  if (typeof raw === "string") {
    const trimmed = raw.replace(/^\[/, "").replace(/\]$/, "");
    return trimmed.split(",").map((part) => Number(part.trim()));
  }
  return [0, 0, 0, 0, 0];
}
