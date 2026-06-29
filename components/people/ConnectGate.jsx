"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createConversation,
  fetchQuoteSnippet,
  stubUnlockConversation,
} from "@/lib/conversationData";
import {
  isPayToConnectEnabled,
  PAY_TO_CONNECT_STUB_PRICE,
} from "@/lib/payToConnect";
import { anonymousLabel } from "@/lib/matchEngine";

export function ConnectGate({
  open,
  onClose,
  recipientId,
  quoteId,
  marginBody,
}) {
  const router = useRouter();
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const payEnabled = isPayToConnectEnabled();

  useEffect(() => {
    if (!open || !quoteId) {
      return;
    }

    let cancelled = false;
    setLoadingQuote(true);
    void fetchQuoteSnippet(quoteId).then((result) => {
      if (cancelled) {
        return;
      }
      if (result.ok) {
        setQuote(result.quote);
      }
      setLoadingQuote(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, quoteId]);

  const handleConnect = useCallback(async () => {
    if (!recipientId || !quoteId) {
      return;
    }

    setBusy(true);
    setError("");

    const created = await createConversation(
      recipientId,
      quoteId,
      marginBody ?? null
    );

    if (!created.ok) {
      setError(created.error);
      setBusy(false);
      return;
    }

    if (payEnabled) {
      const unlocked = await stubUnlockConversation(created.conversationId);
      if (!unlocked.ok) {
        setError(unlocked.error);
        setBusy(false);
        return;
      }
    }

    router.push(`/rozmowa/${created.conversationId}`);
  }, [recipientId, quoteId, marginBody, payEnabled, router]);

  if (!open) {
    return null;
  }

  const authorLine = quote?.work
    ? `${quote.author}, ${quote.work}`
    : quote?.author;

  return (
    <div className="connect-gate" role="dialog" aria-modal="true">
      <button
        type="button"
        className="connect-gate__backdrop"
        aria-label="Zamknij"
        onClick={onClose}
      />
      <div className="connect-gate__panel">
        <p className="connect-gate__kick">Pay-to-connect</p>
        <h2 className="connect-gate__title">
          Rozmowa z {anonymousLabel(recipientId)}
        </h2>
        <p className="connect-gate__lead">
          Zaczynacie od wspólnej nici — cytatu, przy którym was połączyło
          dopasowanie.
        </p>

        <section className="connect-gate__anchor" aria-label="Wspólny cytat">
          {loadingQuote ? (
            <p className="connect-gate__muted">Ładuję cytat…</p>
          ) : quote ? (
            <>
              <blockquote className="connect-gate__quote">
                „{quote.text}"
              </blockquote>
              {authorLine ? (
                <p className="connect-gate__author">— {authorLine}</p>
              ) : null}
            </>
          ) : (
            <p className="connect-gate__muted">
              Brak cytatu — rozmowa wymaga nici z korpusu Wyroczni.
            </p>
          )}
          {marginBody ? (
            <p className="connect-gate__margin">
              Ich margines: „{marginBody}"
            </p>
          ) : null}
        </section>

        {payEnabled ? (
          <div className="connect-gate__pay">
            <p className="connect-gate__pay-label">Bramka (stub)</p>
            <p className="connect-gate__pay-copy">
              Odblokowanie rozmowy 1:1 — {PAY_TO_CONNECT_STUB_PRICE}. Płatność
              testowa; Stripe / Przelewy24 dodamy później.
            </p>
          </div>
        ) : null}

        {error ? <p className="connect-gate__error">{error}</p> : null}

        <div className="connect-gate__actions">
          <button
            type="button"
            className="connect-gate__btn connect-gate__btn--ghost"
            onClick={onClose}
            disabled={busy}
          >
            Anuluj
          </button>
          <button
            type="button"
            className="connect-gate__btn connect-gate__btn--primary"
            onClick={() => void handleConnect()}
            disabled={busy || !quoteId || !quote}
          >
            {busy
              ? "Otwieram…"
              : payEnabled
                ? `Odblokuj (${PAY_TO_CONNECT_STUB_PRICE}, stub)`
                : "Rozpocznij rozmowę"}
          </button>
        </div>
      </div>
    </div>
  );
}
