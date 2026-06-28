import { verifyAdminPassword } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function unauthorized() {
  return Response.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { password } = body;

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return unauthorized();
    }

    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from("match_metrics")
      .select("*")
      .order("computed_at", { ascending: false })
      .limit(20);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ metrics: data ?? [] });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd." },
      { status: 500 }
    );
  }
}
