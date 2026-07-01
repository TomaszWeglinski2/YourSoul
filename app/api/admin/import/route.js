import { verifyAdminPassword } from "@/lib/adminAuth";
import { parseXlsxRows } from "@/lib/adminXlsx";
import {
  importCienieToDb,
  importGlossesToDb,
  importPrzesilenieToDb,
  importTowersToDb,
  validateCienRows,
  validateGlossRows,
  validatePrzesilenieRows,
  validateTowerRows,
} from "@/lib/adminImports";
import { validateQuoteRows, importQuotesToDb } from "@/lib/importQuotes";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

const IMPORT_TYPES = new Set([
  "quotes",
  "glosses",
  "towers",
  "przesilenie",
  "cienie",
]);

export async function POST(request) {
  try {
    const formData = await request.formData();
    const password = formData.get("password");
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "quotes");

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: 401 });
    }

    if (!IMPORT_TYPES.has(type)) {
      return Response.json({ error: `Nieznany typ importu: ${type}.` }, { status: 400 });
    }

    if (!file || typeof file === "string") {
      return Response.json({ error: "Nie wybrano pliku .xlsx." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return Response.json(
        { error: "Dozwolony jest wyłącznie format .xlsx." },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseXlsxRows(buffer);

    if (parsed.error) {
      return Response.json({ error: parsed.error }, { status: 400 });
    }

    const { rows } = parsed;

    if (rows.length === 0) {
      return Response.json({
        added: 0,
        skipped: [],
        warnings: [],
        errors: [{ row: null, message: "Arkusz jest pusty (brak wierszy danych)." }],
      });
    }

    const supabase = createSupabaseAdmin();

    if (type === "quotes") {
      const { valid, skipped, errors: validationErrors } = validateQuoteRows(rows);
      const { added, updated, errors: insertErrors } = await importQuotesToDb(
        supabase,
        valid
      );
      return Response.json({
        added,
        updated,
        skipped,
        warnings: [],
        errors: [...validationErrors, ...insertErrors],
        totalRows: rows.length,
      });
    }

    if (type === "glosses") {
      const { valid, skipped, errors: validationErrors } = validateGlossRows(rows);
      const { added, errors: insertErrors } = await importGlossesToDb(supabase, valid);
      return Response.json({
        added,
        skipped,
        warnings: [],
        errors: [...validationErrors, ...insertErrors],
        totalRows: rows.length,
      });
    }

    if (type === "towers") {
      const { valid, skipped, errors: validationErrors } = validateTowerRows(rows);
      const { added, errors: insertErrors, warnings } = await importTowersToDb(
        supabase,
        valid
      );
      return Response.json({
        added,
        skipped,
        warnings,
        errors: [...validationErrors, ...insertErrors],
        totalRows: rows.length,
      });
    }

    if (type === "przesilenie") {
      const { valid, skipped, errors: validationErrors } =
        validatePrzesilenieRows(rows);
      const { added, errors: insertErrors } = await importPrzesilenieToDb(
        supabase,
        valid
      );
      return Response.json({
        added,
        skipped,
        warnings: [],
        errors: [...validationErrors, ...insertErrors],
        totalRows: rows.length,
      });
    }

    const { valid, skipped, errors: validationErrors } = validateCienRows(rows);
    const { added, errors: insertErrors } = await importCienieToDb(supabase, valid);
    return Response.json({
      added,
      skipped,
      warnings: [],
      errors: [...validationErrors, ...insertErrors],
      totalRows: rows.length,
    });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd importu." },
      { status: 500 }
    );
  }
}
