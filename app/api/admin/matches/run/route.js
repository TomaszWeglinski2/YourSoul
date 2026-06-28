import { verifyAdminPassword } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function unauthorized() {
  return Response.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, topK = 10, region = null } = body;

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return unauthorized();
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc("compute_daily_matches", {
      p_top_k: Number(topK) || 10,
      p_region_filter: region || null,
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ matchBatchId: data });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd." },
      { status: 500 }
    );
  }
}
