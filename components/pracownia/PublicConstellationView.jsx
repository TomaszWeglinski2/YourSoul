"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { UserQuoteCard } from "@/components/pracownia/UserQuoteCard";
import { JourneyCard, JourneyShell } from "@/components/journey/JourneyShell";
import { formatRelativeTime } from "@/lib/savesLibraryUtils";

export function PublicConstellationView() {
  const params = useParams();
  const nick = decodeURIComponent(String(params.nick ?? ""));

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/public-constellation/${encodeURIComponent(nick)}`
        );
        const body = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(body.error ?? "Nie udało się wczytać konstelacji.");
          setData(null);
        } else {
          setData(body);
        }
      } catch {
        if (!cancelled) {
          setError("Nie udało się wczytać konstelacji.");
          setData(null);
        }
      }

      if (!cancelled) {
        setLoading(false);
      }
    }

    if (nick) {
      void load();
    } else {
      setLoading(false);
      setError("Brak nicku w adresie.");
    }

    return () => {
      cancelled = true;
    };
  }, [nick]);

  const notes = data?.notes ?? [];
  const quotes = data?.user_quotes ?? [];
  const isEmpty = !loading && !error && notes.length === 0 && quotes.length === 0;

  return (
    <JourneyShell wide>
      <JourneyCard dark className="pracownia">
        <header className="pracownia__head">
          <p className="pracownia__kick">Publiczna konstelacja</p>
          <h1 className="pracownia__title">{nick || "…"}</h1>
          <p className="pracownia__lead">
            To, co podróżnik świadomie uczynił widocznym — bez feedu, bez
            powiadomień. Oglądasz na żądanie.
          </p>
        </header>

        {loading ? (
          <p className="font-sans text-sm italic text-mistsoft">Ładuję niebo…</p>
        ) : null}

        {error ? (
          <p className="pracownia__error">{error}</p>
        ) : null}

        {isEmpty ? (
          <div className="pracownia-empty">
            <p className="pracownia-empty__title">To niebo jest jeszcze puste</p>
            <p className="pracownia-empty__desc">
              {data?.nick
                ? "Podróżnik nie udostępnił jeszcze publicznie myśli ani cytatów."
                : "Sprawdź nick w adresie."}
            </p>
          </div>
        ) : null}

        {!loading && !error && notes.length > 0 ? (
          <section className="pracownia-section">
            <h2 className="pracownia-section__title">Myśli</h2>
            <ul className="pracownia-notes">
              {notes.map((note) => (
                <li key={note.id} className="pracownia-note">
                  {note.title ? (
                    <p className="pracownia-note__title">{note.title}</p>
                  ) : null}
                  <p className="pracownia-note__body">{note.body}</p>
                  <p className="pracownia-note__meta">
                    {formatRelativeTime(note.updated_at ?? note.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {!loading && !error && quotes.length > 0 ? (
          <section className="pracownia-section">
            <h2 className="pracownia-section__title">Cytaty podróżnika</h2>
            <ul className="pracownia-quotes">
              {quotes.map((quote) => (
                <li key={quote.id}>
                  <UserQuoteCard
                    quote={quote}
                    ownerNick={data.nick}
                    readOnly
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-5 text-center">
          <Link href="/" className="pracownia-link">
            wróć na Próg
          </Link>
        </p>
      </JourneyCard>
    </JourneyShell>
  );
}
