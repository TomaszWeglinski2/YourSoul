import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

function sqlHint(error, fnName, doc) {
  if (error?.message?.includes(fnName)) {
    return ` Uruchom ${doc} w Supabase.`;
  }
  return "";
}

export async function createConversation(recipientId, quoteId, anchorGlosa) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { data, error } = await supabase.rpc("create_conversation", {
    p_recipient_id: recipientId,
    p_quote_id: Number(quoteId),
    p_anchor_glosa: anchorGlosa ?? null,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "create_conversation", "Docs/supabase-conversations.sql")}`,
    };
  }

  return { ok: true, conversationId: data };
}

export async function stubUnlockConversation(conversationId) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { data, error } = await supabase.rpc("stub_unlock_conversation", {
    p_conversation_id: conversationId,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "stub_unlock_conversation", "Docs/supabase-conversations.sql")}`,
    };
  }

  if (!data) {
    return { ok: false, error: "Nie udało się odblokować rozmowy." };
  }

  return { ok: true };
}

export async function fetchConversationThread(conversationId) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany.", thread: null };
  }

  const { data, error } = await supabase.rpc("get_conversation_thread", {
    p_conversation_id: conversationId,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "get_conversation_thread", "Docs/supabase-conversations.sql")}`,
      thread: null,
    };
  }

  if (!data) {
    return { ok: false, error: "Nie znaleziono rozmowy.", thread: null };
  }

  return { ok: true, thread: data };
}

export async function sendConversationMessage(conversationId, body) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { data, error } = await supabase.rpc("send_conversation_message", {
    p_conversation_id: conversationId,
    p_body: body,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "send_conversation_message", "Docs/supabase-conversations.sql")}`,
    };
  }

  return { ok: true, messageId: data };
}

export async function fetchQuoteSnippet(quoteId) {
  const supabase = getSupabaseBrowserClient();
  const id = Number(quoteId);
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "Nieprawidłowy cytat.", quote: null };
  }

  const { data, error } = await supabase
    .from("quotes")
    .select("id, text, author, work")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Brak cytatu.", quote: null };
  }

  return { ok: true, quote: data };
}
