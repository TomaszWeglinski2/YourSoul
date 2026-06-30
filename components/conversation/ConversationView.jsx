"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";
import {
  fetchConversationThread,
  markConversationRead,
  sendConversationMessage,
  stubUnlockConversation,
} from "@/lib/conversationData";
import { isPayToConnectEnabled, PAY_TO_CONNECT_STUB_PRICE } from "@/lib/payToConnect";
import { anonymousLabel, peerIdentityHint } from "@/lib/matchEngine";
import { useAuth } from "@/context/AuthContext";

function formatTime(iso) {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function ConversationView({ conversationId }) {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchConversationThread(conversationId);
    if (!result.ok) {
      setError(result.error);
      setThread(null);
    } else {
      setThread(result.thread);
      if (
        result.thread.payment_status === "stub_unlocked" ||
        result.thread.payment_status === "paid"
      ) {
        await markConversationRead(conversationId);
      }
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load]);

  async function handleUnlock() {
    setUnlocking(true);
    setError("");
    const result = await stubUnlockConversation(conversationId);
    if (!result.ok) {
      setError(result.error);
      setUnlocking(false);
      return;
    }
    await load();
    setUnlocking(false);
  }

  async function handleSend(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) {
      return;
    }

    setSending(true);
    setError("");
    const result = await sendConversationMessage(conversationId, body);
    if (!result.ok) {
      setError(result.error);
      setSending(false);
      return;
    }

    setDraft("");
    await load();
    setSending(false);
  }

  if (authLoading || loading) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">
            Otwieram rozmowę…
          </p>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (!isAuthenticated) {
    return (
      <JourneyShell>
        <JourneyCard>
          <p className="mb-4 font-sans text-sm leading-relaxed text-inksoft">
            Rozmowy są prywatne — zaloguj się, aby kontynuować.
          </p>
          <BrassButton
            onClick={() =>
              router.push(`/logowanie?next=/rozmowa/${conversationId}`)
            }
          >
            zaloguj się
          </BrassButton>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (!thread) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="font-sans text-sm text-tension">
            {error || "Nie znaleziono rozmowy."}
          </p>
        </JourneyCard>
      </JourneyShell>
    );
  }

  const otherId =
    user?.id === thread.initiator_id
      ? thread.recipient_id
      : thread.initiator_id;
  const unlocked =
    thread.payment_status === "stub_unlocked" ||
    thread.payment_status === "paid";
  const authorLine = thread.quote_work
    ? `${thread.quote_author}, ${thread.quote_work}`
    : thread.quote_author;
  const payEnabled = isPayToConnectEnabled();
  const isInitiator = user?.id === thread.initiator_id;
  const pendingPay = payEnabled && thread.payment_status === "pending";

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Rozmowa 1:1
        </p>
        <h1 className="mb-1 font-serif text-[22px] font-medium leading-tight text-[#ece6d8]">
          {anonymousLabel(otherId)}
        </h1>
        {peerIdentityHint(user?.id) ? (
          <p className="mb-2 font-sans text-[10px] text-mistsoft/75">
            {peerIdentityHint(user?.id)}
          </p>
        ) : null}

        <section className="conversation-anchor">
          <p className="conversation-anchor__label">Wspólna nić</p>
          <blockquote className="conversation-anchor__quote">
            „{thread.quote_text}"
          </blockquote>
          {authorLine ? (
            <p className="conversation-anchor__author">— {authorLine}</p>
          ) : null}
          {thread.anchor_glosa ? (
            <p className="conversation-anchor__glosa">{thread.anchor_glosa}</p>
          ) : null}
        </section>

        {pendingPay && isInitiator ? (
          <div className="conversation-pay-stub">
            <p className="conversation-pay-stub__title">Bramka (stub)</p>
            <p className="conversation-pay-stub__copy">
              Odblokuj rozmowę za {PAY_TO_CONNECT_STUB_PRICE} — na razie bez
              prawdziwej płatności.
            </p>
            <button
              type="button"
              className="conversation-pay-stub__btn"
              disabled={unlocking}
              onClick={() => void handleUnlock()}
            >
              {unlocking ? "Odblokowuję…" : `Odblokuj (${PAY_TO_CONNECT_STUB_PRICE})`}
            </button>
          </div>
        ) : null}

        {pendingPay && !isInitiator ? (
          <p className="mb-3 font-sans text-sm italic text-mistsoft">
            Inicjator jeszcze nie odblokował rozmowy.
          </p>
        ) : null}

        {unlocked ? (
          <>
            <div className="conversation-thread">
              {(thread.messages ?? []).length === 0 ? (
                <p className="conversation-thread__empty">
                  Pierwsze słowo należy do was — zacznijcie od tej wspólnej
                  nici.
                </p>
              ) : (
                (thread.messages ?? []).map((msg) => {
                  const mine = msg.sender_id === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`conversation-bubble ${
                        mine ? "conversation-bubble--mine" : ""
                      }`}
                    >
                      <p>{msg.body}</p>
                      <time>{formatTime(msg.created_at)}</time>
                    </div>
                  );
                })
              )}
            </div>

            <form className="conversation-compose" onSubmit={handleSend}>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Odpowiedz przy tej samej nici…"
                rows={3}
              />
              <button type="submit" disabled={sending || !draft.trim()}>
                {sending ? "Wysyłam…" : "Wyślij"}
              </button>
            </form>
          </>
        ) : null}

        {error ? (
          <p className="mt-3 font-sans text-xs text-tension">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={() => router.push("/rozmowy")}
          className="mt-4 block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
        >
          wróć do rozmów prywatnych
        </button>
      </JourneyCard>
    </JourneyShell>
  );
}
