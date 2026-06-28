import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isVectorArray } from "@/lib/journeyMath";
import { findNearestQuote, pickRandomGlosa } from "@/lib/oracleMatch";

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { odcisk, nastroj, pokazane = [] } = body;

    if (!isVectorArray(odcisk) || !isVectorArray(nastroj)) {
      return badRequest(
        "Pola odcisk i nastroj muszą być tablicami po 5 liczb."
      );
    }

    if (pokazane !== undefined && !Array.isArray(pokazane)) {
      return badRequest("Pole pokazane musi być tablicą id cytatów.");
    }

    const supabase = createSupabaseAdmin();
    const quote = await findNearestQuote(
      supabase,
      odcisk,
      nastroj,
      pokazane
    );

    if (!quote) {
      return Response.json(
        { error: "Brak aktywnego cytatu do dopasowania." },
        { status: 404 }
      );
    }

    const glosa = await pickRandomGlosa(supabase, quote.id);

    return Response.json({
      quote: {
        id: quote.id,
        text: quote.text,
        author: quote.author,
        work: quote.work,
        axes: quote.axes,
        cien: quote.cien ?? null,
      },
      glosa,
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message ?? "Nieoczekiwany błąd wyroczni.",
      },
      { status: 500 }
    );
  }
}
