import { verifyAdminPassword } from "@/lib/adminAuth";
import {
  hideQuote,
  listQualityReport,
  listQuotesForAdmin,
  updateQuoteAxes,
} from "@/lib/adminQuotes";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function unauthorized() {
  return Response.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, action } = body;

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return unauthorized();
    }

    const supabase = createSupabaseAdmin();

    if (action === "list") {
      const result = await listQuotesForAdmin(supabase, {
        limit: body.limit ?? 80,
        search: body.search ?? "",
      });
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      return Response.json({ quotes: result.quotes });
    }

    if (action === "update") {
      const { id, axes, source_verified } = body;
      if (!id || !Array.isArray(axes) || axes.length !== 5) {
        return Response.json(
          { error: "Wymagane: id i tablica axes (5 liczb)." },
          { status: 400 }
        );
      }
      const result = await updateQuoteAxes(supabase, {
        id,
        axes,
        source_verified,
      });
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      return Response.json({ ok: true });
    }

    if (action === "quality") {
      const result = await listQualityReport(supabase);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      return Response.json({ rows: result.rows });
    }

    if (action === "hide") {
      const { quoteId } = body;
      if (!quoteId) {
        return Response.json({ error: "Brak quoteId." }, { status: 400 });
      }
      const result = await hideQuote(supabase, quoteId);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd." },
      { status: 500 }
    );
  }
}
