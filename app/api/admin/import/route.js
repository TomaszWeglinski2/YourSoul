import * as XLSX from "xlsx";
import { verifyAdminPassword } from "@/lib/adminAuth";
import { importQuotesToDb, validateQuoteRows } from "@/lib/importQuotes";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const password = formData.get("password");
    const file = formData.get("file");

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: 401 });
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
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return Response.json({ error: "Plik nie zawiera arkuszy." }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
    });

    if (rows.length === 0) {
      return Response.json({
        added: 0,
        skipped: [],
        errors: [{ row: null, message: "Arkusz jest pusty (brak wierszy danych)." }],
      });
    }

    const { valid, skipped, errors: validationErrors } = validateQuoteRows(rows);
    const supabase = createSupabaseAdmin();
    const { added, errors: insertErrors } = await importQuotesToDb(supabase, valid);

    return Response.json({
      added,
      skipped,
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
