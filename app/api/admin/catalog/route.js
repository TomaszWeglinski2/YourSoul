import { verifyAdminPassword } from "@/lib/adminAuth";
import {
  listCienie,
  listGlosses,
  listPrzesilenieTemplates,
  listTowers,
} from "@/lib/adminCatalog";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

const CATALOG_TYPES = new Set(["glosses", "towers", "przesilenie", "cienie"]);

function unauthorized() {
  return Response.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, type } = body;

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return unauthorized();
    }

    if (!CATALOG_TYPES.has(type)) {
      return Response.json({ error: "Nieznany typ katalogu." }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const loaders = {
      glosses: listGlosses,
      towers: listTowers,
      przesilenie: listPrzesilenieTemplates,
      cienie: listCienie,
    };

    const result = await loaders[type](supabase);

    if (!result.ok) {
      return Response.json({ error: result.error }, { status: 500 });
    }

    return Response.json({ items: result.items });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd." },
      { status: 500 }
    );
  }
}
