import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { fetchRandomPrzesilenieScenario } from "@/lib/przesilenieTemplate";

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const axis = Number(body.axis);

    if (!Number.isInteger(axis) || axis < 0 || axis > 4) {
      return badRequest("Pole axis musi być liczbą całkowitą 0–4.");
    }

    const supabase = createSupabaseAdmin();
    const result = await fetchRandomPrzesilenieScenario(supabase, axis);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({
      scenario: result.scenario,
      warning: result.warning ?? null,
    });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nie udało się pobrać przesilenia." },
      { status: 500 }
    );
  }
}
