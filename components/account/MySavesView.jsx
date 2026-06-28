"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchMySavedData } from "@/lib/userData";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pl-PL");
}

export function MySavesView() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchMySavedData();
    if (!result.ok) {
      setError(result.error);
      setData(null);
    } else {
      setData(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/logowanie?next=/moje-zapisy");
      return;
    }
    load();
  }, [authLoading, isAuthenticated, load, router]);

  if (authLoading || (!isAuthenticated && !error)) {
    return null;
  }

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Twoje zapisy w bazie
        </p>
        <h1 className="mb-2 font-serif text-[25px] font-medium leading-tight text-[#ece6d8]">
          Moje zapisy
        </h1>
        <p className="mb-4 font-sans text-sm leading-relaxed text-mist">
          Podgląd tego, co Supabase zapisało na Twoim koncie
          {data?.email ? ` (${data.email})` : ""}.
        </p>

        {loading ? (
          <p className="font-sans text-sm italic text-mistsoft">Ładuję…</p>
        ) : null}

        {error ? (
          <p className="mb-4 font-sans text-xs text-tension">{error}</p>
        ) : null}

        {data && !loading ? (
          <div className="space-y-5 font-sans text-sm text-mist">
            <section className="rounded-[10px] border border-brass/25 bg-brass/10 p-3">
              <p className="mb-2 text-[10.5px] uppercase tracking-[0.14em] text-brass">
                Profil (Wrota)
              </p>
              {data.profile ? (
                <>
                  <p className="mb-1 text-mistsoft">
                    Ostatnia aktualizacja:{" "}
                    {formatDate(data.profile.updated_at)}
                  </p>
                  <p className="mb-1">
                    <span className="text-mistsoft">Światy: </span>
                    {data.profile.worlds?.length
                      ? data.profile.worlds.join(", ")
                      : "— brak —"}
                  </p>
                  <p>
                    <span className="text-mistsoft">Odcisk: </span>
                    {Array.isArray(data.profile.odcisk)
                      ? `[${data.profile.odcisk.map((n) => Number(n).toFixed(2)).join(", ")}]`
                      : "— brak —"}
                  </p>
                </>
              ) : (
                <p className="italic text-mistsoft">
                  Brak wiersza w profiles — przejdź Wrota po zalogowaniu.
                </p>
              )}
            </section>

            <section className="rounded-[10px] border border-brass/25 bg-brass/10 p-3">
              <p className="mb-2 text-[10.5px] uppercase tracking-[0.14em] text-brass">
                Konstelacja ({data.collections.length})
              </p>
              {data.collections.length === 0 ? (
                <p className="italic text-mistsoft">
                  Brak — kliknij „to zostaje ze mną" przy cytacie.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.collections.map((row) => (
                    <li
                      key={row.id}
                      className="border-b border-brass/15 pb-2 last:border-0 last:pb-0"
                    >
                      <p className="font-serif italic text-[#ece6d8]">
                        „{row.quotes?.text ?? `cytat #${row.quote_id}`}"
                      </p>
                      <p className="text-xs text-mistsoft">
                        {row.quotes?.author ?? "—"}
                        {row.quotes?.work ? `, ${row.quotes.work}` : ""} ·{" "}
                        {formatDate(row.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[10px] border border-brass/25 bg-brass/10 p-3">
              <p className="mb-2 text-[10.5px] uppercase tracking-[0.14em] text-brass">
                Marginesy ({data.margins.length})
              </p>
              {data.margins.length === 0 ? (
                <p className="italic text-mistsoft">
                  Brak — dopisz myśl przy cytacie i zapisz.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.margins.map((row) => (
                    <li
                      key={row.id}
                      className="border-b border-brass/15 pb-2 last:border-0 last:pb-0"
                    >
                      <p className="font-serif italic text-[#ece6d8]">
                        „{row.body}"
                      </p>
                      <p className="text-xs text-mistsoft">
                        przy: „{row.quotes?.text?.slice(0, 60) ?? row.quote_id}
                        …" · {row.visibility} · {formatDate(row.created_at)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-[10px] border border-brass/25 bg-brass/10 p-3">
              <p className="mb-2 text-[10.5px] uppercase tracking-[0.14em] text-brass">
                Rezonanse ({data.reactions.length})
              </p>
              {data.reactions.length === 0 ? (
                <p className="italic text-mistsoft">
                  Brak — kliknij „to też mnie poruszyło" przy publicznym
                  marginesie.
                </p>
              ) : (
                <ul className="space-y-1 text-xs text-mistsoft">
                  {data.reactions.map((row) => (
                    <li key={row.id}>
                      Margines #{row.margin_id} · {formatDate(row.created_at)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2">
          <BrassButton onClick={() => load()} className="mt-0">
            Odśwież
          </BrassButton>
          <Link
            href="/zaproszenia"
            className="block text-center font-sans text-xs text-brass hover:underline"
          >
            Zaproszenia i zaufanie
          </Link>
          <Link
            href="/drzewo"
            className="block text-center font-sans text-xs text-brass hover:underline"
          >
            Publiczne drzewo poleceń
          </Link>
          <Link
            href="/wyrocznia"
            className="block text-center font-sans text-xs text-brass hover:underline"
          >
            Wróć do Wyroczni
          </Link>
        </div>
      </JourneyCard>
    </JourneyShell>
  );
}
