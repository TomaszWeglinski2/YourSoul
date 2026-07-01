import { verifyAdminPassword } from "@/lib/adminAuth";
import { EXPORT_TYPES } from "@/lib/adminColumnFormats";
import { buildAdminExport } from "@/lib/adminExport";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function parseFilters(body) {
  const filters = {};

  if (body?.filters?.unverifiedOnly === true) {
    filters.unverifiedOnly = true;
  }

  const domain = String(body?.filters?.domain ?? "").trim();
  if (domain) {
    filters.domain = domain;
  }

  const createdAfter = String(body?.filters?.createdAfter ?? "").trim();
  if (createdAfter) {
    filters.createdAfter = createdAfter;
  }

  return filters;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, type } = body;

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return Response.json({ error: auth.error }, { status: 401 });
    }

    const exportType = String(type ?? "");
    if (!EXPORT_TYPES.has(exportType)) {
      return Response.json(
        { error: `Nieznany typ eksportu: ${exportType}.` },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();
    const filters = parseFilters(body);
    const result = await buildAdminExport(supabase, exportType, filters);

    if (!result) {
      return Response.json({ error: "Eksport nie powiódł się." }, { status: 500 });
    }

    return new Response(result.buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "X-Export-Row-Count": String(result.rowCount),
      },
    });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd eksportu." },
      { status: 500 }
    );
  }
}
