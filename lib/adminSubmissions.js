import { parseAxesFromDb } from "@/lib/adminXlsx";
import { duplicateMessage } from "@/lib/quoteSubmissionUtils";

export async function listPendingSubmissions(supabase) {
  const { data, error } = await supabase
    .from("quote_submissions")
    .select(
      "id, user_id, user_quote_id, text, author, work, year, public_domain, status, created_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message, submissions: [] };
  }

  const rows = data ?? [];
  const userIds = [...new Set(rows.map((row) => row.user_id))];

  let nickByUser = {};
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);

    nickByUser = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id, p.display_name ?? null])
    );
  }

  return {
    ok: true,
    submissions: rows.map((row) => ({
      ...row,
      nick: nickByUser[row.user_id] ?? null,
    })),
  };
}

export async function rejectSubmission(supabase, { id, reviewerNote }) {
  const note = String(reviewerNote ?? "").trim();
  if (!note) {
    return { ok: false, error: "Podaj powód odrzucenia (reviewer_note)." };
  }

  const { data, error } = await supabase
    .from("quote_submissions")
    .update({
      status: "rejected",
      reviewer_note: note,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Nie znaleziono oczekującego zgłoszenia." };
  }

  return { ok: true };
}

async function findCorpusDuplicate(supabase, text, author) {
  const { data, error } = await supabase.rpc("check_quote_submission_duplicate", {
    p_text: text,
    p_author: author,
  });

  if (error) {
    return { ok: false, error: error.message, duplicate: false };
  }

  if (data?.duplicate) {
    return {
      ok: false,
      error: duplicateMessage(data.kind),
      duplicate: true,
    };
  }

  return { ok: true, duplicate: false };
}

export async function acceptSubmission(supabase, { id, axes, reviewerNote }) {
  if (!Array.isArray(axes) || axes.length !== 5) {
    return { ok: false, error: "Wymagane 5 osi (−1..+1)." };
  }

  for (const value of axes) {
    if (typeof value !== "number" || value < -1 || value > 1) {
      return { ok: false, error: "Każda oś musi być liczbą z zakresu −1..+1." };
    }
  }

  const { data: submission, error: readError } = await supabase
    .from("quote_submissions")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();

  if (readError) {
    return { ok: false, error: readError.message };
  }

  if (!submission) {
    return { ok: false, error: "Nie znaleziono oczekującego zgłoszenia." };
  }

  const dup = await findCorpusDuplicate(
    supabase,
    submission.text,
    submission.author
  );
  if (!dup.ok) {
    return dup;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", submission.user_id)
    .maybeSingle();

  const proposedBy = profile?.display_name?.trim() || null;

  const { data: quote, error: insertError } = await supabase
    .from("quotes")
    .insert({
      text: submission.text,
      author: submission.author,
      work: submission.work,
      year: submission.year,
      axes,
      source_verified: false,
      status: "active",
      proposed_by: proposedBy,
      domains: [],
    })
    .select("id, text, author, axes, proposed_by")
    .single();

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  const { error: updateError } = await supabase
    .from("quote_submissions")
    .update({
      status: "accepted",
      reviewer_note: reviewerNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
      accepted_quote_id: quote.id,
    })
    .eq("id", id);

  if (updateError) {
    return {
      ok: false,
      error: `Cytat utworzony (id ${quote.id}), ale zgłoszenie nie zaktualizowane: ${updateError.message}`,
      quoteId: quote.id,
    };
  }

  return {
    ok: true,
    quote: {
      ...quote,
      axes: parseAxesFromDb(quote.axes),
    },
  };
}
