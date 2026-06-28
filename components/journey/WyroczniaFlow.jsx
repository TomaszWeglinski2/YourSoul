"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DICHO, ECHO } from "@/lib/journeyConstants";
import { adjustMoodTowardQuote } from "@/lib/journeyMath";
import {
  addToCollection,
  fetchMyReactionsForMargins,
  fetchPublicMargins,
  flagQuote,
  saveMargin as saveMarginDb,
  toggleMarginReaction,
} from "@/lib/userData";
import { useAuth } from "@/context/AuthContext";
import { useJourney } from "@/context/JourneyContext";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";

function anonymousLabel(userId) {
  return `Podróżnik ·${userId.slice(-4)}`;
}

async function callOracle(odcisk, nastroj, pokazane) {
  const response = await fetch("/api/oracle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ odcisk, nastroj, pokazane }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Wyrocznia nie odpowiedziała.");
  }
  return data;
}

export function WyroczniaFlow() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const {
    wrotaComplete,
    odcisk,
    mood,
    di,
    shown,
    current,
    marg,
    flagged,
    answerDicho,
    setCurrentQuote,
    addToShown,
    saveMargin,
    setFlagged,
    addToZielnik,
    setMood,
  } = useJourney();

  const [step, setStep] = useState("dicho");
  const [glosaRevealed, setGlosaRevealed] = useState(false);
  const [marginText, setMarginText] = useState("");
  const [marginPublic, setMarginPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keepLoading, setKeepLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveWarning, setSaveWarning] = useState("");
  const [publicMargins, setPublicMargins] = useState([]);
  const [reactedMarginIds, setReactedMarginIds] = useState(new Set());
  const [chorusLoading, setChorusLoading] = useState(false);

  useEffect(() => {
    if (!wrotaComplete) {
      router.replace("/wrota");
    }
  }, [wrotaComplete, router]);

  useEffect(() => {
    if (step === "dicho" && di >= DICHO.length) {
      setStep("weigh");
    }
  }, [step, di]);

  useEffect(() => {
    if (step !== "chorus" || !current?.id) return;

    async function loadChorus() {
      setChorusLoading(true);
      const result = await fetchPublicMargins(current.id);
      if (result.ok) {
        setPublicMargins(result.margins);
        const reactions = await fetchMyReactionsForMargins(
          result.margins.map((row) => row.id)
        );
        if (reactions.ok) {
          setReactedMarginIds(reactions.reactedIds);
        }
      }
      setChorusLoading(false);
    }

    loadChorus();
  }, [step, current?.id]);

  async function handleSilence() {
    setStep("chorus");
  }

  async function handleFlagQuote() {
    setFlagged(current.id);
    if (isAuthenticated) {
      const result = await flagQuote(current.id);
      if (!result.ok) {
        setSaveWarning(result.error);
      }
    }
    setStep("chorus");
  }

  async function handleKeepQuote() {
    const text = marginText.trim();
    setKeepLoading(true);
    setError("");
    setSaveWarning("");

    if (text) {
      saveMargin(current.id, text, marginPublic);
    }
    addToZielnik(current);

    if (isAuthenticated) {
      const collectionResult = await addToCollection(current.id);
      if (!collectionResult.ok) {
        setSaveWarning(collectionResult.error);
      }

      if (text) {
        const marginResult = await saveMarginDb({
          quoteId: current.id,
          body: text,
          visibility: marginPublic ? "public" : "private",
        });
        if (!marginResult.ok) {
          setSaveWarning((prev) =>
            prev ? `${prev} ${marginResult.error}` : marginResult.error
          );
        }
      }
    }

    setKeepLoading(false);
    setStep("chorus");
  }

  async function handleMarginResonance(marginId) {
    if (!isAuthenticated) {
      router.push(`/logowanie?next=/wyrocznia`);
      return;
    }

    const result = await toggleMarginReaction(marginId);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setReactedMarginIds((prev) => {
      const next = new Set(prev);
      if (result.active) {
        next.add(marginId);
      } else {
        next.delete(marginId);
      }
      return next;
    });
  }

  const fetchQuote = useCallback(
    async (moodOverride) => {
      setLoading(true);
      setError("");
      try {
        const data = await callOracle(
          odcisk,
          moodOverride ?? mood,
          shown
        );
        const quote = {
          id: data.quote.id,
          t: data.quote.text,
          a: data.quote.author,
          w: data.quote.work,
          g: data.glosa,
          cien: data.quote.cien ?? null,
          v: data.quote.axes,
        };
        setCurrentQuote(quote);
        addToShown(quote.id);
        setGlosaRevealed(false);
        setMarginText("");
        setMarginPublic(false);
        setSaveWarning("");
        setStep("quote");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [odcisk, mood, shown, setCurrentQuote, addToShown]
  );

  if (!wrotaComplete) {
    return null;
  }

  if (step === "dicho") {
    if (di >= DICHO.length) {
      return null;
    }

    const d = DICHO[di];

    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
            Wyrocznia · nastrój ({di + 1}/{DICHO.length})
          </p>
          <h1 className="mb-4 font-serif text-[25px] font-medium leading-tight text-[#ece6d8]">
            {d.q}
          </h1>
          <button
            type="button"
            onClick={() => answerDicho(d.axis, "neg")}
            className="mt-3 block w-full cursor-pointer rounded-xl border border-brass/40 bg-brass/5 px-4 py-[18px] text-center font-serif text-lg text-[#e6e0d2] transition-all duration-200 hover:border-brass hover:bg-brass/15 hover:-translate-y-px"
          >
            {d.neg}
          </button>
          <button
            type="button"
            onClick={() => answerDicho(d.axis, "pos")}
            className="mt-3 block w-full cursor-pointer rounded-xl border border-brass/40 bg-brass/5 px-4 py-[18px] text-center font-serif text-lg text-[#e6e0d2] transition-all duration-200 hover:border-brass hover:bg-brass/15 hover:-translate-y-px"
          >
            {d.pos}
          </button>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (step === "weigh") {
    return (
      <JourneyShell>
        <JourneyCard dark className="text-center">
          <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
            Wyrocznia
          </p>
          <p className="my-[18px] font-serif text-lg italic text-[#ece6d8]">
            Wyrocznia waży twoje wybory…
          </p>
          {error ? (
            <p className="mb-3 font-sans text-xs text-[#cdd3ea]">{error}</p>
          ) : null}
          <BrassButton
            disabled={loading}
            onClick={() => fetchQuote()}
            className="mt-0"
          >
            {loading ? "Szukam słowa…" : "Odsłoń słowo"}
          </BrassButton>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (step === "quote" && current) {
    const authorLine = current.a
      ? `— ${current.a}${current.w ? `, ${current.w}` : ""}`
      : "";

    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
            Twoje słowo na dziś
          </p>
          <p className="py-3.5 text-center font-serif text-[23px] italic leading-[1.4] text-[#ece6d8]">
            „{current.t}"
          </p>

          {!glosaRevealed ? (
            <button
              type="button"
              onClick={() => setGlosaRevealed(true)}
              className="mt-2.5 block w-full rounded-[11px] border border-mist/30 bg-transparent px-4 py-3 font-sans text-sm text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10 hover:text-mist"
            >
              odsłoń glosę
            </button>
          ) : (
            <>
              {current.g ? (
                <div className="mt-1 rounded-r-lg border-l-2 border-brass bg-brass/20 px-3.5 py-3 font-serif text-base leading-normal text-[#f3ecdb]">
                  {current.g}
                </div>
              ) : null}
              {authorLine ? (
                <p className="mt-1.5 text-center font-sans text-xs tracking-wide text-mistsoft">
                  {authorLine}
                </p>
              ) : null}

              <div className="mt-[18px]">
                <p className="mb-1.5 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brassdeep">
                  A Ty — co w tym słyszysz?
                </p>
                <textarea
                  value={marginText}
                  onChange={(event) => setMarginText(event.target.value)}
                  placeholder="Możesz dopisać myśl. Albo zostawić puste."
                  className="mt-1.5 min-h-[74px] w-full resize-y rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2.5 font-serif text-[15px] text-[#ece6d8] placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
                />
                <label className="mt-2.5 flex items-center gap-2 font-sans text-[12.5px] text-mistsoft">
                  <input
                    type="checkbox"
                    checked={marginPublic}
                    onChange={(event) => setMarginPublic(event.target.checked)}
                    className="accent-brass"
                  />
                  pokaż mój margines innym (anonimowo)
                </label>
              </div>

              <div className="mt-4">
                <p className="mb-2 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brassdeep">
                  Co z tym cytatem?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSilence()}
                    className="flex-1 rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
                  >
                    zostaw w ciszy
                  </button>
                  <button
                    type="button"
                    disabled={keepLoading}
                    onClick={() => void handleKeepQuote()}
                    className="flex-1 rounded-[11px] border border-brass bg-brass px-3 py-2.5 font-sans text-[13px] text-[#fff8ec] transition-all duration-150 hover:bg-brassdeep disabled:opacity-60"
                  >
                    {keepLoading ? "Zapisuję…" : "to zostaje ze mną"}
                  </button>
                </div>
                {error ? (
                  <p className="mt-2 font-sans text-xs text-tension">{error}</p>
                ) : null}
                {saveWarning ? (
                  <p className="mt-2 font-sans text-xs text-tension">
                    Zapis w bazie nie powiódł się: {saveWarning}. Cytat jest w
                    sesji lokalnej.
                  </p>
                ) : null}
                {!isAuthenticated ? (
                  <p className="mt-2 text-center font-sans text-[11px] italic text-mistsoft">
                    Zaloguj się, aby zapisać cytat i margines w bazie.
                  </p>
                ) : null}
                <p className="mt-[7px] text-center font-sans text-[11px] italic text-mistsoft">
                  po lewej — nie zostaje; po prawej — wchodzi do Twojej
                  konstelacji
                </p>
                <button
                  type="button"
                  onClick={() => void handleFlagQuote()}
                  className="mt-3.5 block w-full rounded-[10px] border border-tension/25 bg-transparent px-3 py-2.5 text-left transition-all duration-150 hover:border-tension hover:bg-tension/10"
                >
                  <span className="block font-sans text-xs text-tension">
                    to oklepane — zgłoś do usunięcia z systemu
                  </span>
                  <span className="mt-0.5 block font-sans text-[10px] italic text-mistsoft">
                    ocena cytatu dla redakcji — nie zachowuję go u siebie
                  </span>
                </button>
              </div>
            </>
          )}
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (step === "chorus" && current) {
    const header = marg[current.id]
      ? "Najpierw napisałeś — teraz słyszysz innych"
      : "Inni przy tym samym cytacie";

    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
            {header}
          </p>
          {flagged[current.id] ? (
            <p className="mb-2.5 font-sans text-[11.5px] italic text-tension">
              ✓ Zgłoszony do usunięcia — dzięki, to pomaga czyścić korpus.
            </p>
          ) : null}
          {saveWarning ? (
            <p className="mb-2.5 font-sans text-[11.5px] text-tension">
              Zapis w bazie nie powiódł się: {saveWarning}
            </p>
          ) : null}
          <p className="py-2 text-center font-serif text-[19px] italic leading-[1.4] text-[#ece6d8]">
            „{current.t}"
          </p>

          <div className="mt-4 border-t border-brass/25 pt-3.5">
            {chorusLoading ? (
              <p className="py-2 font-sans text-xs italic text-mistsoft">
                Ładuję głosy innych…
              </p>
            ) : publicMargins.length > 0 ? (
              publicMargins.map((row) => {
                const active = reactedMarginIds.has(row.id);
                return (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-2.5 py-2 font-serif text-sm italic text-mistsoft"
                  >
                    <span className="text-mist">
                      „{row.body}"{" "}
                      <span className="opacity-70">
                        — {anonymousLabel(row.user_id)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleMarginResonance(row.id)}
                      className={`shrink-0 rounded-2xl border px-2.5 py-1 font-sans text-[11px] not-italic transition-all duration-150 ${
                        active
                          ? "border-brass bg-brass text-[#fff8ec]"
                          : "border-brass/40 text-brassdeep hover:bg-brass/15"
                      }`}
                    >
                      {active
                        ? "poruszyło i Ciebie"
                        : "to też mnie poruszyło"}
                    </button>
                  </div>
                );
              })
            ) : (
              ECHO.map((echo) => (
                <div
                  key={echo.by}
                  className="flex items-center justify-between gap-2.5 py-2 font-serif text-sm italic text-mistsoft"
                >
                  <span className="text-mist">
                    „{echo.m}"{" "}
                    <span className="opacity-70">— {echo.by}</span>
                  </span>
                  <span className="shrink-0 rounded-2xl border border-brass/20 px-2.5 py-1 font-sans text-[10px] not-italic text-mistsoft">
                    przykład
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="mt-[18px]">
            <p className="mb-2 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brassdeep">
              Dokąd dalej?
            </p>
            {error ? (
              <p className="mb-2 font-sans text-xs text-[#cdd3ea]">{error}</p>
            ) : null}
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                if (!current.v) return;
                const nextMood = adjustMoodTowardQuote(mood, current.v);
                setMood(nextMood);
                await fetchQuote(nextMood);
              }}
              className="mb-2 block w-full rounded-[11px] border border-brass/45 bg-brass/5 px-3 py-2.5 font-sans text-[13px] text-[#e6e0d2] transition-all duration-150 hover:border-brass hover:bg-brass/15 disabled:opacity-50"
            >
              {loading ? "Szukam…" : "jeszcze w tym tonie"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/zielnik")}
              className="mb-2 block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
            >
              Twój zielnik (zapiski)
            </button>
            <button
              type="button"
              onClick={() => router.push("/konstelacja")}
              className="block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
            >
              zobacz konstelację
            </button>
          </div>
        </JourneyCard>
      </JourneyShell>
    );
  }

  return null;
}
