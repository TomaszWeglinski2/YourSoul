"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";
import { anonymousLabel, matchTag, MATCH_MODES } from "@/lib/matchEngine";
import {
  fetchMatchCards,
  fetchMyReactionsForMargins,
  toggleMarginReaction,
} from "@/lib/userData";
import { useAuth } from "@/context/AuthContext";
import { ConnectGate } from "@/components/people/ConnectGate";
import { isPayToConnectEnabled } from "@/lib/payToConnect";

function formatComputedAt(iso) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function PeopleView() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [mode, setMode] = useState("like_me");
  const [cards, setCards] = useState([]);
  const [myOdcisk, setMyOdcisk] = useState(null);
  const [computedAt, setComputedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reactedIds, setReactedIds] = useState(new Set());
  const [connectTarget, setConnectTarget] = useState(null);

  const payToConnect = isPayToConnectEnabled();

  const load = useCallback(async (selectedMode) => {
    setLoading(true);
    setError("");

    const result = await fetchMatchCards(selectedMode);

    if (!result.ok) {
      setError(result.error ?? "Nie udało się wczytać dopasowań.");
      setCards([]);
      setLoading(false);
      return;
    }

    setCards(result.cards);
    setMyOdcisk(result.myOdcisk);
    setComputedAt(result.cards[0]?.computed_at ?? null);

    const marginIds = result.cards
      .map((row) => row.public_margin_id)
      .filter(Boolean);

    const reactions = await fetchMyReactionsForMargins(marginIds);
    setReactedIds(reactions.reactedIds ?? new Set());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    void load(mode);
  }, [authLoading, isAuthenticated, mode, load]);

  async function handleResonance(marginId) {
    const result = await toggleMarginReaction(marginId);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setReactedIds((prev) => {
      const next = new Set(prev);
      if (result.active) {
        next.add(marginId);
      } else {
        next.delete(marginId);
      }
      return next;
    });
  }

  if (authLoading || loading) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">
            Szukam ludzi na Twojej orbicie…
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
            Dopasowania są osobiste — zaloguj się, żeby zobaczyć ludzi na
            podobnej orbicie.
          </p>
          <BrassButton onClick={() => router.push("/logowanie?next=/ludzie")}>
            zaloguj się
          </BrassButton>
        </JourneyCard>
      </JourneyShell>
    );
  }

  const modeMeta = MATCH_MODES.find((item) => item.id === mode);

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Spotkania
        </p>
        <h1 className="mb-2 font-serif text-[22px] font-medium leading-tight text-[#ece6d8]">
          {modeMeta?.label ?? "Ludzie"}
        </h1>
        <p className="mb-4 font-sans text-xs leading-relaxed text-mistsoft">
          Warstwa 1: bliskość odcisku (pgvector). Warstwa 2: wspólne rzadkie
          nici i zapisy (IDF). Lista odświeża się raz na dobę.
          {computedAt ? (
            <span className="mt-1 block opacity-80">
              Ostatnie dopasowanie: {formatComputedAt(computedAt)}.
            </span>
          ) : null}
        </p>

        <div className="mb-4 flex gap-2">
          {MATCH_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`flex-1 rounded-[10px] border px-2 py-2 font-sans text-[11px] transition-all duration-150 ${
                mode === item.id
                  ? "border-brass bg-brass/20 text-[#ece6d8]"
                  : "border-mist/25 text-mistsoft hover:border-mist/45"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? (
          <p className="mb-3 font-sans text-xs text-tension">{error}</p>
        ) : null}

        {cards.length === 0 && !error ? (
          <div className="rounded-[10px] border border-mist/20 bg-black/20 px-3 py-4">
            <p className="font-sans text-sm leading-relaxed text-mistsoft">
              Jeszcze nie ma dopasowań — potrzebujesz odcisku z Wyroczni i co
              najmniej jednej innej osoby w sieci. Przeliczenie uruchamia się
              codziennie o 03:00 UTC.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {cards.map((row) => {
              const tag = matchTag({
                mode,
                rank: row.rank,
                idfScore: row.idf_score,
                myOdcisk,
                matchedOdcisk: row.matched_odcisk,
              });
              const reacted = row.public_margin_id
                ? reactedIds.has(row.public_margin_id)
                : false;

              return (
                <div
                  key={row.match_id}
                  className="rounded-[11px] border border-mist/20 bg-black/25 px-3.5 py-3"
                >
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-serif text-[15px] text-[#ece6d8]">
                      {anonymousLabel(row.matched_user_id)}
                    </span>
                    <span className="font-sans text-[10px] uppercase tracking-[0.12em] text-brass">
                      {tag}
                    </span>
                  </div>

                  {row.public_margin_body ? (
                    <div className="mb-2 font-serif text-sm italic leading-relaxed text-mistsoft">
                      „{row.public_margin_body}"
                    </div>
                  ) : (
                    <p className="mb-2 font-sans text-xs italic text-mistsoft/80">
                      Brak publicznego marginesu — rezonans możliwy, gdy zostawi
                      coś przy gwieździe.
                    </p>
                  )}

                  {row.public_margin_id ? (
                    <button
                      type="button"
                      onClick={() => void handleResonance(row.public_margin_id)}
                      className={`rounded-2xl border px-2.5 py-1 font-sans text-[11px] transition-all duration-150 ${
                        reacted
                          ? "border-brass bg-brass text-[#fff8ec]"
                          : "border-brass/40 text-brassdeep hover:bg-brass/15"
                      }`}
                    >
                      {reacted
                        ? "poruszyło i Ciebie"
                        : "to też mnie poruszyło"}
                    </button>
                  ) : null}

                  {payToConnect && row.public_margin_quote_id ? (
                    <button
                      type="button"
                      className="people-connect-btn"
                      onClick={() =>
                        setConnectTarget({
                          recipientId: row.matched_user_id,
                          quoteId: row.public_margin_quote_id,
                          marginBody: row.public_margin_body ?? "",
                        })
                      }
                    >
                      napisz 1:1 (pay-to-connect)
                    </button>
                  ) : null}

                  <p className="mt-2 font-sans text-[10px] text-mistsoft/60">
                    IDF {row.idf_score.toFixed(2)} · odległość odcisku{" "}
                    {row.odcisk_distance.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={() => router.push("/konstelacja")}
          className="mt-4 block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
        >
          wróć do konstelacji
        </button>
      </JourneyCard>

      <ConnectGate
        open={Boolean(connectTarget)}
        onClose={() => setConnectTarget(null)}
        recipientId={connectTarget?.recipientId}
        quoteId={connectTarget?.quoteId}
        marginBody={connectTarget?.marginBody}
      />
    </JourneyShell>
  );
}
