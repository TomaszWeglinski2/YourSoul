"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { lastName, normalizeStarFromDb, normalizeThreadFromDb } from "@/lib/constellationMath";
import { fetchZielnikData } from "@/lib/userData";
import { useAuth } from "@/context/AuthContext";
import { useJourney } from "@/context/JourneyContext";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";

function ZielnikEntry({ star, margin, onRevealShadow }) {
  const [shadowVisible, setShadowVisible] = useState(false);
  const hasMargin = Boolean(margin?.body?.trim());
  const canRevealShadow = hasMargin && star.cien;

  return (
    <div className="mb-5 border-b border-brass/20 pb-5 last:mb-0 last:border-b-0">
      <p className="font-serif text-[17px] italic leading-[1.45] text-[#ece6d8]">
        „{star.t}"
      </p>
      <p className="mt-1 font-sans text-xs text-mistsoft">
        — {star.a}
        {star.w ? `, ${star.w}` : ""}
      </p>
      {star.g ? (
        <p className="mt-2 font-serif text-sm leading-relaxed text-mist">
          {star.g}
        </p>
      ) : null}
      {hasMargin ? (
        <div className="mt-3 rounded-lg border border-brass/25 bg-brass/5 px-3 py-2.5">
          <p className="mb-1 font-sans text-[10px] uppercase tracking-[0.14em] text-brassdeep">
            Twój margines
            {margin.visibility === "public" ? " · publiczny" : " · prywatny"}
          </p>
          <p className="font-serif text-sm italic text-[#e6e0d2]">
            {margin.body}
          </p>
        </div>
      ) : null}
      {canRevealShadow && !shadowVisible ? (
        <button
          type="button"
          onClick={() => {
            setShadowVisible(true);
            onRevealShadow?.();
          }}
          className="mt-3 cursor-pointer rounded-lg border border-mist/25 bg-transparent px-3 py-2 font-sans text-xs text-mistsoft transition-all duration-150 hover:border-mist/45 hover:bg-mist/10"
        >
          ✦ odsłoń cień
        </button>
      ) : null}
      {canRevealShadow && shadowVisible ? (
        <div className="mt-3 rounded-lg border border-mist/20 bg-[#161b29]/60 px-3.5 py-3">
          <p className="mb-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-mistsoft">
            Cień — człowiek za słowem
          </p>
          <p className="font-serif text-sm italic leading-relaxed text-[#b8c0d4]">
            {star.cien}
          </p>
          <p className="mt-2.5 font-sans text-xs leading-relaxed text-mistsoft">
            Nie po to, by go pomniejszyć — po to, byś wiedział, że nawet ten,
            kto to napisał, był tylko człowiekiem. Jak Ty, gdy pisałeś przy tym
            swój margines.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ZielnikView() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { zielnik, marg, pub } = useJourney();

  const [stars, setStars] = useState([]);
  const [marginsByQuote, setMarginsByQuote] = useState({});
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    if (isAuthenticated) {
      const result = await fetchZielnikData();
      if (!result.ok) {
        setError(result.error);
        setStars([]);
        setMarginsByQuote({});
        setThreads([]);
      } else {
        const seen = new Set();
        const loaded = [];
        (result.collections ?? []).forEach((row) => {
          const star = normalizeStarFromDb(row);
          if (!seen.has(star.id)) {
            seen.add(star.id);
            loaded.push(star);
          }
        });
        setStars(loaded);
        setMarginsByQuote(result.marginsByQuote ?? {});
        setThreads((result.nici ?? []).map(normalizeThreadFromDb));
      }
    } else {
      setStars(zielnik);
      const localMargins = {};
      Object.entries(marg).forEach(([quoteId, body]) => {
        if (body?.trim()) {
          localMargins[quoteId] = {
            body,
            visibility: pub[quoteId] ? "public" : "private",
          };
        }
      });
      setMarginsByQuote(localMargins);
      setThreads([]);
    }

    setLoading(false);
  }, [isAuthenticated, zielnik, marg, pub]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">
            Otwieram zielnik…
          </p>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (stars.length === 0 && threads.length === 0) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
            Twój zielnik
          </p>
          <h1 className="mb-2.5 font-serif text-[25px] font-medium leading-tight text-[#ece6d8]">
            Jeszcze pusto.
          </h1>
          <p className="mb-4 font-sans text-sm leading-relaxed text-mist">
            Wróć do Wyroczni, dopisz margines i zachowaj kilka słów. Tu
            zbierają się Twoje zapiski — cytaty, Twoje marginesy i nici.
          </p>
          <BrassButton onClick={() => router.push("/wyrocznia")}>
            Do Wyroczni
          </BrassButton>
        </JourneyCard>
      </JourneyShell>
    );
  }

  const starById = Object.fromEntries(stars.map((s) => [s.id, s]));

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Twój zielnik — prywatna antologia
        </p>

        {error ? (
          <p className="mb-3 font-sans text-xs text-tension">{error}</p>
        ) : null}

        {stars.map((star) => (
          <ZielnikEntry
            key={star.id}
            star={star}
            margin={marginsByQuote[star.id]}
          />
        ))}

        {threads.length > 0 ? (
          <div className="mt-5 border-t border-brass/25 pt-4">
            <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
              Twoje nici
            </p>
            {threads.map((thread, idx) => {
              const qa = starById[thread.a];
              const qb = starById[thread.b];
              const sym = thread.type === "napiecie" ? "↮" : "✦";
              return (
                <p
                  key={thread.id ?? idx}
                  className={`mb-2 font-serif text-sm italic ${
                    thread.type === "napiecie" ? "text-tension" : "text-mist"
                  }`}
                >
                  {qa ? lastName(qa.a) : "?"} {sym}{" "}
                  {qb ? lastName(qb.a) : "?"} — „{thread.glosa}"
                </p>
              );
            })}
          </div>
        ) : null}

        <p className="mt-4 font-sans text-[11px] italic leading-relaxed text-mistsoft">
          Cień — człowiek za słowem — odsłania się tylko przy cytatach, którym
          dałeś własny margines.
        </p>

        <button
          type="button"
          onClick={() => router.push("/konstelacja")}
          className="mt-4 block w-full rounded-[11px] border border-brass/45 bg-brass/5 px-3 py-2.5 font-sans text-[13px] text-[#e6e0d2] transition-all duration-150 hover:border-brass hover:bg-brass/15"
        >
          zobacz konstelację
        </button>
        <button
          type="button"
          onClick={() => router.push("/wyrocznia")}
          className="mt-2 block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
        >
          wróć do Wyroczni
        </button>
      </JourneyCard>
    </JourneyShell>
  );
}
