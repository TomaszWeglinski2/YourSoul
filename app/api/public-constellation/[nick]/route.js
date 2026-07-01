import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

export async function GET(_request, { params }) {
  const nick = decodeURIComponent(params.nick ?? "").trim();

  if (!nick || nick.length < 3) {
    return badRequest("Podaj nick podróżnika (min. 3 znaki).");
  }

  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase.rpc("get_public_constellation", {
      p_nick: nick,
    });

    if (error) {
      const hint = error.message?.includes("get_public_constellation")
        ? " Uruchom Docs/supabase-pracownia.sql w Supabase."
        : "";
      return Response.json(
        { error: `${error.message}${hint}` },
        { status: 500 }
      );
    }

    if (!data) {
      return Response.json(
        { error: "Nie znaleziono podróżnika o tym nicku." },
        { status: 404 }
      );
    }

    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err?.message ?? "Nie udało się wczytać publicznej konstelacji." },
      { status: 500 }
    );
  }
}
