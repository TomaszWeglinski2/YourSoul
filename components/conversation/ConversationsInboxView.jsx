"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";
import { fetchMyConversations } from "@/lib/conversationData";
import { anonymousLabel } from "@/lib/matchEngine";
import { useAuth } from "@/context/AuthContext";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function truncate(text, max = 88) {
  const normalized = String(text ?? "").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trim()}…`;
}

function conversationBadge(row) {
  if (row.payment_status === "pending" && row.my_role === "recipient") {
    return { label: "nowa rozmowa", tone: "new" };
  }
  if (row.is_new) {
    return { label: "nowa", tone: "new" };
  }
  if (row.needs_reply || row.unread_count > 0) {
    return { label: "czeka na Ciebie", tone: "reply" };
  }
  if (row.payment_status === "pending" && row.my_role === "initiator") {
    return { label: "odblokuj", tone: "pending" };
  }
  return null;
}

export function ConversationsInboxView() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchMyConversations();
    if (!result.ok) {
      setError(result.error ?? "Nie udało się wczytać rozmów.");
      setRows([]);
    } else {
      setRows(result.conversations);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load]);

  if (authLoading || loading) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">
            Otwieram skrzynkę rozmów…
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
            Rozmowy prywatne są osobiste — zaloguj się, aby je zobaczyć.
          </p>
          <BrassButton onClick={() => router.push("/logowanie?next=/rozmowy")}>
            zaloguj się
          </BrassButton>
        </JourneyCard>
      </JourneyShell>
    );
  }

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Skrzynka
        </p>
        <h1 className="mb-2 font-serif text-[22px] font-medium leading-tight text-[#ece6d8]">
          Rozmowy prywatne
        </h1>
        <p className="mb-4 font-sans text-xs leading-relaxed text-mistsoft">
          Wszystkie rozmowy 1:1 — nowe, czekające na odpowiedź i te, które
          trwają między sesjami. Zapisują się w bazie.
        </p>

        {error ? (
          <p className="mb-3 font-sans text-xs text-tension">{error}</p>
        ) : null}

        {rows.length === 0 && !error ? (
          <div className="inbox-empty">
            <p className="font-sans text-sm leading-relaxed text-mistsoft">
              Jeszcze nie masz rozmów. Zacznij od dopasowania w Spotkaniach —
              gdy ktoś napisze, pojawi się tutaj.
            </p>
            <Link href="/ludzie" className="inbox-empty__link">
              przejdź do spotkań
            </Link>
          </div>
        ) : (
          <ul className="inbox-list">
            {rows.map((row) => {
              const badge = conversationBadge(row);
              const preview =
                row.last_message_body ??
                (row.payment_status === "pending"
                  ? "Rozmowa czeka na odblokowanie."
                  : truncate(row.quote_text, 96));
              const when = row.last_message_at ?? row.updated_at;

              return (
                <li key={row.conversation_id}>
                  <Link
                    href={`/rozmowa/${row.conversation_id}`}
                    className={`inbox-row ${badge ? `inbox-row--${badge.tone}` : ""}`}
                  >
                    <div className="inbox-row__head">
                      <span className="inbox-row__name">
                        {anonymousLabel(row.other_user_id)}
                      </span>
                      {badge ? (
                        <span
                          className={`inbox-row__badge inbox-row__badge--${badge.tone}`}
                        >
                          {badge.label}
                        </span>
                      ) : null}
                    </div>
                    <p className="inbox-row__quote">
                      „{truncate(row.quote_text, 72)}"
                    </p>
                    <p className="inbox-row__preview">{preview}</p>
                    <time className="inbox-row__time">{formatWhen(when)}</time>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => router.push("/ludzie")}
          className="mt-4 block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
        >
          szukaj nowych spotkań
        </button>
      </JourneyCard>
    </JourneyShell>
  );
}
