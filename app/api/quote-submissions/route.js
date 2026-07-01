import { duplicateMessage, validateSubmissionPayload } from "@/lib/quoteSubmissionUtils";
import { MONTHLY_SUBMISSION_LIMIT } from "@/lib/quoteSubmissionUtils";
import { getServerUser } from "@/lib/supabaseServer";

function badRequest(message, extra = {}) {
  return Response.json({ error: message, ...extra }, { status: 400 });
}

function unauthorized(message = "Nie jesteś zalogowany.") {
  return Response.json({ error: message }, { status: 401 });
}

export async function POST(request) {
  try {
    const { supabase, user, error: authError } = await getServerUser();

    if (!user || !supabase) {
      return unauthorized(authError);
    }

    const body = await request.json();
    const validation = validateSubmissionPayload({
      text: body.text,
      author: body.author,
      work: body.work,
      year: body.year,
      publicDomain: Boolean(body.public_domain ?? body.publicDomain),
    });

    if (!validation.ok) {
      return badRequest(validation.error);
    }

    const { data: usedCount, error: quotaError } = await supabase.rpc(
      "count_my_quote_submissions_this_month"
    );

    if (quotaError) {
      const hint = quotaError.message?.includes("count_my_quote_submissions")
        ? " Uruchom Docs/supabase-quote-submissions.sql w Supabase."
        : "";
      return Response.json(
        { error: `${quotaError.message}${hint}` },
        { status: 500 }
      );
    }

    if (Number(usedCount ?? 0) >= MONTHLY_SUBMISSION_LIMIT) {
      return badRequest(
        `Limit ${MONTHLY_SUBMISSION_LIMIT} zgłoszeń na miesiąc — moderacja jest ręczna, spróbuj w kolejnym miesiącu.`
      );
    }

    const { data: dup, error: dupError } = await supabase.rpc(
      "check_quote_submission_duplicate",
      {
        p_text: validation.text,
        p_author: validation.author,
      }
    );

    if (dupError) {
      return Response.json({ error: dupError.message }, { status: 500 });
    }

    if (dup?.duplicate) {
      return badRequest(duplicateMessage(dup.kind), {
        duplicate: true,
        kind: dup.kind,
        quoteId: dup.quote_id ?? null,
      });
    }

    const userQuoteId = body.user_quote_id ?? body.userQuoteId ?? null;

    if (userQuoteId) {
      const { data: ownedQuote, error: quoteError } = await supabase
        .from("user_quotes")
        .select("id, kind")
        .eq("id", userQuoteId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (quoteError) {
        return Response.json({ error: quoteError.message }, { status: 500 });
      }

      if (!ownedQuote) {
        return badRequest("Nie znaleziono cytatu w Pracowni.");
      }

      if (ownedQuote.kind !== "found") {
        return badRequest("Do Wyroczni można zgłaszać tylko znalezione cytaty.");
      }

      const { data: existingSub } = await supabase
        .from("quote_submissions")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("user_quote_id", userQuoteId)
        .maybeSingle();

      if (existingSub?.status === "pending") {
        return badRequest("To zgłoszenie czeka już na moderację.");
      }

      if (existingSub?.status === "accepted") {
        return badRequest("Ten cytat został już przyjęty do korpusu.");
      }

      if (existingSub?.status === "rejected") {
        const { data: updated, error: updateError } = await supabase
          .from("quote_submissions")
          .update({
            text: validation.text,
            author: validation.author,
            work: validation.work,
            year: validation.year,
            public_domain: true,
            status: "pending",
            reviewer_note: null,
            reviewed_at: null,
            accepted_quote_id: null,
            created_at: new Date().toISOString(),
          })
          .eq("id", existingSub.id)
          .select("id, status, created_at")
          .single();

        if (updateError) {
          return Response.json({ error: updateError.message }, { status: 500 });
        }

        return Response.json({
          ok: true,
          submission: updated,
          message:
            "Zgłoszenie ponownie trafiło do moderacji. Cytat nie wchodzi do Wyroczni automatycznie.",
        });
      }
    }

    const { data, error } = await supabase
      .from("quote_submissions")
      .insert({
        user_id: user.id,
        user_quote_id: userQuoteId,
        text: validation.text,
        author: validation.author,
        work: validation.work,
        year: validation.year,
        public_domain: true,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return badRequest("To zgłoszenie zostało już wysłane.");
      }
      const hint = error.message?.includes("quote_submissions")
        ? " Uruchom Docs/supabase-quote-submissions.sql w Supabase."
        : "";
      return Response.json(
        { error: `${error.message}${hint}` },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      submission: data,
      message:
        "Zgłoszenie trafiło do moderacji. Cytat nie wchodzi do Wyroczni automatycznie.",
    });
  } catch (err) {
    return Response.json(
      { error: err?.message ?? "Nie udało się wysłać zgłoszenia." },
      { status: 500 }
    );
  }
}
