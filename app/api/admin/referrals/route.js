import { verifyAdminPassword } from "@/lib/adminAuth";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";

function unauthorized() {
  return Response.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateCodeString() {
  let result = "";
  for (let i = 0; i < 8; i += 1) {
    result += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return result;
}

async function createAdminCodes(supabase, tier, count) {
  const normalizedTier = tier === "trusted" ? "trusted" : "regular";
  const total = Math.max(1, Math.min(Number(count) || 1, 20));
  const created = [];

  for (let n = 0; n < total; n += 1) {
    let inserted = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = generateCodeString();
      const { data, error } = await supabase
        .from("invite_codes")
        .insert({
          code,
          inviter_id: null,
          tier: normalizedTier,
          is_admin: true,
          status: "available",
        })
        .select("id, code, tier, status, created_at")
        .single();

      if (!error && data) {
        inserted = data;
        break;
      }
      if (error?.code !== "23505") {
        return { ok: false, error: error?.message ?? "Nie udało się utworzyć kodu." };
      }
    }

    if (!inserted) {
      return { ok: false, error: "Nie udało się wygenerować unikalnego kodu." };
    }
    created.push(inserted);
  }

  return { ok: true, codes: created };
}

async function setUserInviteAccess(supabase, userId, mode, noviceUntil) {
  const updates = {};

  if (mode === "trusted") {
    updates.invite_access_tier = "trusted";
    updates.novice_until_override = new Date().toISOString();
  } else if (mode === "unlock_now") {
    updates.novice_until_override = new Date().toISOString();
  } else if (mode === "novice_until" && noviceUntil) {
    updates.novice_until_override = new Date(noviceUntil).toISOString();
  } else {
    return { ok: false, error: "Nieznany tryb lub brak daty." };
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

async function listUsersForAdmin(supabase, search = "") {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, display_name, trust_score, invite_access_tier, wrota_completed_at, is_banned, created_at, invite_pool"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (profilesError) {
    return { ok: false, error: profilesError.message, users: [] };
  }

  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  if (authError) {
    return { ok: false, error: authError.message, users: [] };
  }

  const emailById = Object.fromEntries(
    (authData?.users ?? []).map((row) => [row.id, row.email ?? null])
  );

  let users = (profiles ?? []).map((row) => ({
    ...row,
    email: emailById[row.id] ?? null,
  }));

  const query = String(search ?? "").trim().toLowerCase();
  if (query) {
    users = users.filter(
      (row) =>
        row.display_name?.toLowerCase().includes(query) ||
        row.email?.toLowerCase().includes(query) ||
        row.id.toLowerCase().includes(query)
    );
  }

  return { ok: true, users };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { password, action, userId, tier, count, mode, noviceUntil, search } =
      body;

    const auth = verifyAdminPassword(String(password ?? ""));
    if (!auth.ok) {
      return unauthorized();
    }

    const supabase = createSupabaseAdmin();

    if (action === "create_codes") {
      const result = await createAdminCodes(supabase, tier, count);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      return Response.json({ codes: result.codes });
    }

    if (action === "set_user_access" && userId) {
      const result = await setUserInviteAccess(
        supabase,
        String(userId),
        mode,
        noviceUntil
      );
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 400 });
      }
      return Response.json({ ok: true });
    }

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

    if (action === "list_users") {
      const result = await listUsersForAdmin(supabase, search);
      if (!result.ok) {
        return Response.json({ error: result.error }, { status: 500 });
      }
      return Response.json({ users: result.users });
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

    const [flagsRes, journalRes, adminCodesRes, usersResult] = await Promise.all([
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
      supabase
        .from("invite_codes")
        .select("id, code, tier, status, created_at, used_at, completed_at")
        .eq("is_admin", true)
        .order("created_at", { ascending: false })
        .limit(30),
      listUsersForAdmin(supabase, ""),
    ]);

    if (flagsRes.error) {
      return Response.json({ error: flagsRes.error.message }, { status: 500 });
    }

    return Response.json({
      flags: flagsRes.data ?? [],
      journal: journalRes.data ?? [],
      adminCodes: adminCodesRes.data ?? [],
      users: usersResult.ok ? usersResult.users : [],
      usersError: usersResult.ok ? null : usersResult.error,
      journalError: journalRes.error?.message ?? null,
      adminCodesError: adminCodesRes.error?.message ?? null,
    });
  } catch (error) {
    return Response.json(
      { error: error.message ?? "Nieoczekiwany błąd." },
      { status: 500 }
    );
  }
}
