import { verifyAdminPassword } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function unauthorized() {
  return Response.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, action, userId } = body;

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return unauthorized();
    }

    const supabase = createSupabaseAdmin();

    if (action === "ban" && userId) {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: true, banned_at: new Date().toISOString() })
        .eq("id", userId);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ ok: true });
    }

    if (action === "review_flag" && body.flagId) {
      const { error } = await supabase
        .from("referral_abuse_flags")
        .update({ reviewed_at: new Date().toISOString() })
        .eq("id", body.flagId);

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({ ok: true });
    }

    const [flagsRes, journalRes] = await Promise.all([
      supabase
        .from("referral_abuse_flags")
        .select("id, user_id, flag_type, severity, details, created_at, reviewed_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("trust_journal")
        .select("id, user_id, delta, trust_before, trust_after, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (flagsRes.error) {
      return Response.json({ error: flagsRes.error.message }, { status: 500 });
    }

    return Response.json({
      flags: flagsRes.data ?? [],
      journal: journalRes.data ?? [],
      journalError: journalRes.error?.message ?? null,
    });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd." },
      { status: 500 }
    );
  }
}
