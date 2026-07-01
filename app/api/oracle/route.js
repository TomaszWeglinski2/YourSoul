import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isVectorArray } from "@/lib/journeyMath";
import { findNearestQuote, pickRandomGlosa } from "@/lib/oracleMatch";
import { resolveOracleDailyLimit } from "@/lib/oracleLimits";
import { getServerUser } from "@/lib/supabaseServer";

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

    const supabaseAdmin = createSupabaseAdmin();
    const quote = await findNearestQuote(
      supabaseAdmin,
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

    const glosa = await pickRandomGlosa(supabaseAdmin, quote.id);

    const { supabase, user } = await getServerUser();
    let draws = null;

    if (user && supabase) {
      const dailyLimit = resolveOracleDailyLimit(null);

      const { data: drawResult, error: drawError } = await supabase.rpc(
        "consume_oracle_draw",
        {
          p_quote_id: quote.id,
          p_daily_limit: dailyLimit,
        }
      );

      if (drawError) {
        const hint = drawError.message?.includes("consume_oracle_draw")
          ? " Uruchom Docs/supabase-oracle-draws.sql w Supabase."
          : "";
        return Response.json(
          { error: `${drawError.message}${hint}` },
          { status: 500 }
        );
      }

      if (!drawResult?.ok) {
        return Response.json(
          {
            error:
              "Dzisiejszy limit wróżb wyczerpany. Wyrocznia milczy do jutra.",
            draws: drawResult,
          },
          { status: 429 }
        );
      }

      draws = drawResult;
    }

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
      draws,
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
