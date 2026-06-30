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

export async function fetchMyConversations() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany.", conversations: [] };
  }

  const { data, error } = await supabase.rpc("get_my_conversations");

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "get_my_conversations", "Docs/supabase-conversations-inbox.sql")}`,
      conversations: [],
    };
  }

  return { ok: true, conversations: data ?? [] };
}

export async function fetchUnreadConversationCount() {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: true, count: 0 };
  }

  const { data, error } = await supabase.rpc("get_unread_conversation_count");

  if (error) {
    return {
      ok: false,
      count: 0,
      error: `${error.message}${sqlHint(error, "get_unread_conversation_count", "Docs/supabase-conversations-inbox.sql")}`,
    };
  }

  return { ok: true, count: Number(data ?? 0) };
}

export async function markConversationRead(conversationId) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany." };
  }

  const { error } = await supabase.rpc("mark_conversation_read", {
    p_conversation_id: conversationId,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "mark_conversation_read", "Docs/supabase-conversations-inbox.sql")}`,
    };
  }

  return { ok: true };
}

export async function fetchConversationWithPeer(otherUserId) {
  const supabase = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Nie jesteś zalogowany.", conversationId: null };
  }

  const { data, error } = await supabase.rpc("get_conversation_with_peer", {
    p_other_user_id: otherUserId,
  });

  if (error) {
    return {
      ok: false,
      error: `${error.message}${sqlHint(error, "get_conversation_with_peer", "Docs/supabase-conversations-inbox.sql")}`,
      conversationId: null,
    };
  }

  return { ok: true, conversationId: data ?? null };
}
