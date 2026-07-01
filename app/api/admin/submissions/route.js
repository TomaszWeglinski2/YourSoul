import { verifyAdminPassword } from "@/lib/adminAuth";
import {
  acceptSubmission,
  listPendingSubmissions,
  rejectSubmission,
} from "@/lib/adminSubmissions";
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
      const result = await listPendingSubmissions(supabase);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      return Response.json({ submissions: result.submissions });
    }

    if (action === "reject") {
      const { id, reviewerNote } = body;
      if (!id) {
        return Response.json({ error: "Brak id zgłoszenia." }, { status: 400 });
      }
      const result = await rejectSubmission(supabase, { id, reviewerNote });
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 });
      }
      return Response.json({ ok: true });
    }

    if (action === "accept") {
      const { id, axes, reviewerNote } = body;
      if (!id) {
        return Response.json({ error: "Brak id zgłoszenia." }, { status: 400 });
      }
      const result = await acceptSubmission(supabase, {
        id,
        axes,
        reviewerNote,
      });
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 });
      }
      return Response.json({ ok: true, quote: result.quote });
    }

    return Response.json({ error: "Nieznana akcja." }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd." },
      { status: 500 }
    );
  }
}
