"use client";

import { useCallback, useState } from "react";
import { buildQuoteShareUrl } from "@/lib/shareQuote";
import { fetchFirstAvailableInviteCode } from "@/lib/referralData";

export function ShareQuoteButton({ quoteId, className = "" }) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleShare = useCallback(async () => {
    if (!quoteId) {
      return;
    }

    const id = String(quoteId);
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const inviteCode = await fetchFirstAvailableInviteCode();
      const url = buildQuoteShareUrl(id, inviteCode);

      if (!url) {
        setStatus("error");
        setMessage("Nie udało się zbudować linku.");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: "Your Soul — Karta Wyroczni",
          text: "Cytat z Wyroczni",
          url,
        });
        setStatus("done");
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus("done");
      setMessage("Link skopiowany — udostępnij kartę z kodem polecającym.");
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      setStatus("error");
      setMessage("Nie udało się udostępnić. Spróbuj ponownie.");
    }
  }, [quoteId]);

  if (!quoteId) {
    return null;
  }

  return (
    <div className={`share-quote ${className}`.trim()}>
      <button
        type="button"
        className="share-quote__btn"
        onClick={handleShare}
        disabled={status === "loading"}
      >
        {status === "loading" ? "Przygotowuję link…" : "Udostępnij kartę"}
      </button>
      {message ? (
        <p
          className={`share-quote__msg ${
            status === "error" ? "share-quote__msg--error" : ""
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
