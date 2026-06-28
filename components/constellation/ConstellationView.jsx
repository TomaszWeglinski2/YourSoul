"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AXES } from "@/lib/journeyConstants";
import { pickTowerGlosa } from "@/lib/constellationData";
import {
  findTowers,
  lastName,
  layoutStars,
  normalizeStarFromDb,
  normalizeThreadFromDb,
  tensionAxis,
} from "@/lib/constellationMath";
import {
  fetchConstellationData,
  saveThread,
} from "@/lib/userData";
import { useAuth } from "@/context/AuthContext";
import { useJourney } from "@/context/JourneyContext";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";
import { PrzesilenieView } from "@/components/constellation/PrzesilenieView";

function starsFromCollections(rows) {
  const seen = new Set();
  const stars = [];
  rows.forEach((row) => {
    const star = normalizeStarFromDb(row);
    if (!seen.has(star.id)) {
      seen.add(star.id);
      stars.push(star);
    }
  });
  return stars;
}

function TowerModal({ tower, stars, onClose }) {
  const authors = tower.comp
    .map((id) => stars.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => lastName(s.a));

  const meta = pickTowerGlosa(tower.axis);

  return (
    <JourneyCard dark>
      <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
        Wieża Sensu · oś {AXES[tower.axis]}
      </p>
      <p className="py-2 text-center font-serif text-[19px] italic leading-[1.4] text-[#ece6d8]">
        „{authors.join(", ")} mówią jednym głosem: {meta}"
      </p>
      <p className="mt-3 font-sans text-xs italic leading-relaxed text-mistsoft">
        Wyłoniła się, bo sam połączyłeś nićmi co najmniej trzy cytaty z
        przeciwnych biegunów osi „{AXES[tower.axis]}". To sens, którego żaden z
        nich nie niósł osobno — inny dla każdej osi, którą zwiążesz.
      </p>
      <BrassButton onClick={onClose} className="mt-4">
        wróć do konstelacji
      </BrassButton>
    </JourneyCard>
  );
}

export function ConstellationView() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { zielnik, dimmedQuoteId, setDimmedQuoteId } = useJourney();

  const [stars, setStars] = useState([]);
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [linkMode, setLinkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [linkType, setLinkType] = useState(null);
  const [bindText, setBindText] = useState("");
  const [bindError, setBindError] = useState("");
  const [saving, setSaving] = useState(false);

  const [selectedQuote, setSelectedQuote] = useState(null);
  const [activeTower, setActiveTower] = useState(null);
  const [przesilenie, setPrzesilenie] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    if (isAuthenticated) {
      const result = await fetchConstellationData();
      if (!result.ok) {
        setError(result.error);
        setStars([]);
        setThreads([]);
      } else {
        setStars(starsFromCollections(result.collections));
        setThreads((result.nici ?? []).map(normalizeThreadFromDb));
      }
    } else {
      setStars(zielnik);
      setThreads([]);
    }

    setLoading(false);
  }, [isAuthenticated, zielnik]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const positions = useMemo(
    () => (stars.length ? layoutStars(stars) : {}),
    [stars]
  );

  const towers = useMemo(
    () => findTowers(stars, threads),
    [stars, threads]
  );

  const starById = useMemo(
    () => Object.fromEntries(stars.map((s) => [s.id, s])),
    [stars]
  );

  const tensionAxisValue =
    selectedIds.length === 2
      ? tensionAxis(starById[selectedIds[0]], starById[selectedIds[1]])
      : -1;

  function handleStarClick(starId) {
    if (linkMode && !linkType) {
      setSelectedIds((prev) => {
        if (prev.includes(starId)) {
          return prev.filter((id) => id !== starId);
        }
        if (prev.length >= 2) return prev;
        return [...prev, starId];
      });
      return;
    }
    if (!linkMode) {
      setSelectedQuote(starById[starId] ?? null);
    }
  }

  function cancelLinking() {
    setLinkMode(false);
    setSelectedIds([]);
    setLinkType(null);
    setBindText("");
    setBindError("");
  }

  async function handleBind() {
    const glosa = bindText.trim();
    if (!glosa) {
      setBindError(
        "Bez własnych słów nić się nie zawiąże — to jest właśnie ten wysiłek."
      );
      return;
    }

    const [a, b] = selectedIds;
    const qa = starById[a];
    const qb = starById[b];
    if (!qa || !qb) return;

    setSaving(true);
    setBindError("");

    if (isAuthenticated) {
      const axis =
        linkType === "napiecie"
          ? tensionAxis(qa, qb) >= 0
            ? tensionAxis(qa, qb)
            : null
          : null;

      const result = await saveThread({
        quoteAId: a,
        quoteBId: b,
        type: linkType,
        glosa,
        axis,
      });

      if (!result.ok) {
        setBindError(result.error);
        setSaving(false);
        return;
      }
    } else {
      setThreads((prev) => [
        ...prev,
        { a, b, type: linkType, glosa, axis: null },
      ]);
    }

    if (linkType === "napiecie") {
      const ax = tensionAxis(qa, qb);
      setPrzesilenie({ quoteA: qa, quoteB: qb, axis: ax >= 0 ? ax : 0 });
      cancelLinking();
    } else {
      cancelLinking();
      await loadData();
    }

    setSaving(false);
  }

  function handlePrzesilenieComplete() {
    setPrzesilenie(null);
    void loadData();
  }

  if (przesilenie) {
    return (
      <JourneyShell>
        <PrzesilenieView
          quoteA={przesilenie.quoteA}
          quoteB={przesilenie.quoteB}
          axis={przesilenie.axis}
          onComplete={handlePrzesilenieComplete}
          onDimSacrifice={setDimmedQuoteId}
        />
      </JourneyShell>
    );
  }

  if (activeTower) {
    return (
      <JourneyShell>
        <TowerModal
          tower={activeTower}
          stars={stars}
          onClose={() => setActiveTower(null)}
        />
      </JourneyShell>
    );
  }

  if (loading) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">
            Rozpinam mapę…
          </p>
        </JourneyCard>
      </JourneyShell>
    );
  }

  if (stars.length === 0) {
    return (
      <JourneyShell>
        <JourneyCard dark>
          <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
            Konstelacja
          </p>
          <h1 className="mb-2.5 font-serif text-[25px] font-medium leading-tight text-[#ece6d8]">
            Twoje niebo jest jeszcze ciemne.
          </h1>
          <p className="mb-4 font-sans text-sm leading-relaxed text-mist">
            Wróć do Wyroczni i zachowaj kilka gwiazd. Z nich zbudujesz mapę
            własnego rozumienia.
          </p>
          <BrassButton onClick={() => router.push("/wyrocznia")}>
            Do Wyroczni
          </BrassButton>
        </JourneyCard>
      </JourneyShell>
    );
  }

  const W = 400;
  const H = 412;

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          Twoja konstelacja — mapa rozumienia
        </p>

        {error ? (
          <p className="mb-2 font-sans text-xs text-tension">{error}</p>
        ) : null}

        <div className="overflow-hidden rounded-xl bg-[radial-gradient(120%_100%_at_50%_30%,#1b2236_0%,#11151f_100%)]">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
            <defs>
              <radialGradient id="towerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c4995a" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#c4995a" stopOpacity="0" />
              </radialGradient>
            </defs>

            {Array.from({ length: 7 }).map((_, f) => (
              <circle
                key={f}
                cx={40 + f * 52}
                cy={30 + ((f * 73) % 360)}
                r={1.6}
                fill="#39435e"
                opacity={0.55}
              />
            ))}

            {threads.map((thread, idx) => {
              const pa = positions[thread.a];
              const pb = positions[thread.b];
              if (!pa || !pb) return null;

              if (thread.type === "napiecie") {
                return (
                  <g key={thread.id ?? idx}>
                    <line
                      x1={pa.x}
                      y1={pa.y - 3}
                      x2={pb.x}
                      y2={pb.y - 3}
                      stroke="#8a93c4"
                      strokeWidth={1.3}
                      strokeDasharray="5 4"
                      opacity={0.9}
                    />
                    <line
                      x1={pa.x}
                      y1={pa.y + 3}
                      x2={pb.x}
                      y2={pb.y + 3}
                      stroke="#5e68a0"
                      strokeWidth={1.3}
                      strokeDasharray="5 4"
                      opacity={0.9}
                    />
                  </g>
                );
              }

              return (
                <line
                  key={thread.id ?? idx}
                  x1={pa.x}
                  y1={pa.y}
                  x2={pb.x}
                  y2={pb.y}
                  stroke="#c4995a"
                  strokeWidth={1.2}
                  opacity={0.55}
                />
              );
            })}

            {towers.map((tower, idx) => {
              const cx =
                tower.comp.reduce((sum, id) => sum + positions[id].x, 0) /
                tower.comp.length;
              const cy =
                tower.comp.reduce((sum, id) => sum + positions[id].y, 0) /
                tower.comp.length;

              return (
                <g
                  key={idx}
                  className="cursor-pointer"
                  onClick={() => setActiveTower(tower)}
                >
                  <circle cx={cx} cy={cy} r={40} fill="url(#towerGlow)" />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={7}
                    fill="#1a1f30"
                    stroke="#c4995a"
                    strokeWidth={1.4}
                  />
                  <circle cx={cx} cy={cy} r={2.3} fill="#c4995a" />
                  <text
                    x={cx}
                    y={cy + 20}
                    textAnchor="middle"
                    className="fill-brass font-serif text-[10px]"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Wieża · {AXES[tower.axis]}
                  </text>
                </g>
              );
            })}

            {stars.map((star) => {
              const p = positions[star.id];
              if (!p) return null;

              const dimmed = dimmedQuoteId === star.id;
              const selected = selectedIds.includes(star.id);
              const ly = p.y > 205 ? p.y + 18 : p.y - 12;

              return (
                <g
                  key={star.id}
                  className={`cursor-pointer ${dimmed ? "opacity-35" : ""}`}
                  onClick={() => handleStarClick(star.id)}
                >
                  <circle cx={p.x} cy={p.y} r={14} fill="#c4995a" opacity={0} />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={selected ? 8 : 6}
                    fill={selected ? "#fff3dc" : "#f3e7cf"}
                    stroke={selected ? "#fff3dc" : "#c4995a"}
                    strokeWidth={selected ? 2 : 1.3}
                  />
                  <circle cx={p.x} cy={p.y} r={2.1} fill="#9a7236" />
                  <text
                    x={p.x}
                    y={ly}
                    textAnchor="middle"
                    className="fill-mistsoft font-sans text-[9.5px]"
                  >
                    {lastName(star.a)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {selectedQuote && !linkMode ? (
          <div className="mt-3 rounded-r-lg border-l-2 border-brass bg-brass/10 px-3.5 py-3 font-serif text-base leading-normal text-[#ece6d8]">
            „{selectedQuote.t}"
            <span className="mt-1.5 block font-sans text-[11px] text-brass">
              — {selectedQuote.a}
              {selectedQuote.w ? `, ${selectedQuote.w}` : ""}
            </span>
          </div>
        ) : null}

        <p className="mt-3 font-sans text-[11px] italic leading-relaxed text-mistsoft">
          Złota pleciona Wieża to sens ze zgody. Chłodna, rozszczepiona nić to
          napięcie, które sam nazwałeś. Przesilenia rodzą się dopiero, gdy
          poprowadzisz nić napięcia między dwiema gwiazdami i ją nazwiesz.
          Każda gwiazda jest podpisana autorem — dotknij jej, by zobaczyć pełny
          cytat.
        </p>

        {linkMode ? (
          <div className="mt-4">
            {selectedIds.length < 2 ? (
              <p className="font-sans text-xs italic text-mistsoft">
                {selectedIds.length === 1
                  ? "Jedna gwiazda wybrana. Dotknij drugiej, z którą rozmawia."
                  : "Dotknij dwóch gwiazd, które chcesz połączyć."}
              </p>
            ) : !linkType ? (
              <>
                <p className="mb-2 font-sans text-xs italic text-mistsoft">
                  Dwie gwiazdy wybrane. Co naprawdę je łączy?
                </p>
                <BrassButton
                  onClick={() => setLinkType("pokrewienstwo")}
                  className="mt-0"
                >
                  rymują się — pokrewieństwo
                </BrassButton>
                {tensionAxisValue >= 0 ? (
                  <button
                    type="button"
                    onClick={() => setLinkType("napiecie")}
                    className="mt-2 block w-full rounded-[11px] border border-tension/50 bg-transparent px-3 py-2.5 font-sans text-[13px] text-[#cdd3ea] transition-all duration-150 hover:border-tension hover:bg-tension/10"
                  >
                    kłócą się — napięcie (oś {AXES[tensionAxisValue]})
                  </button>
                ) : (
                  <p className="mt-2.5 font-sans text-xs italic text-tension">
                    Te dwie raczej nie stoją w sprzeczności — nie widać tu
                    napięcia do wykucia. Łączy je co najwyżej pokrewieństwo.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="mb-2 font-sans text-xs italic text-mistsoft">
                  {linkType === "napiecie"
                    ? "Nazwij to napięcie — czego jedno żąda kosztem drugiego?"
                    : "Dlaczego się rymują? Co mówią jednym głosem?"}
                </p>
                <textarea
                  value={bindText}
                  onChange={(e) => {
                    setBindText(e.target.value);
                    setBindError("");
                  }}
                  placeholder="Twoimi słowami. To jest klucz, którego klikanie nie podrobi…"
                  className="mt-1 min-h-[74px] w-full resize-y rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2.5 font-serif text-[15px] text-[#ece6d8] placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
                />
                {bindError ? (
                  <p className="mt-1.5 font-sans text-xs text-tension">
                    {bindError}
                  </p>
                ) : null}
                <BrassButton
                  disabled={saving}
                  onClick={() => void handleBind()}
                  className="mt-2"
                >
                  {saving
                    ? "Wiążę…"
                    : linkType === "napiecie"
                      ? "zwiąż i wejdź w przesilenie"
                      : "zwiąż nicią pokrewieństwa"}
                </BrassButton>
              </>
            )}
            <button
              type="button"
              onClick={cancelLinking}
              className="mt-2 block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
            >
              odłóż wiązanie
            </button>
          </div>
        ) : (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                setLinkMode(true);
                setSelectedIds([]);
                setLinkType(null);
                setSelectedQuote(null);
              }}
              className="mb-2 block w-full rounded-[11px] border border-brass/45 bg-brass/5 px-3 py-2.5 font-sans text-[13px] text-[#e6e0d2] transition-all duration-150 hover:border-brass hover:bg-brass/15"
            >
              połącz nicią
            </button>
            <button
              type="button"
              onClick={() => router.push("/zielnik")}
              className="mb-2 block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
            >
              Twój zielnik
            </button>
            <button
              type="button"
              onClick={() => router.push("/wyrocznia")}
              className="block w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2.5 font-sans text-[13px] text-mistsoft transition-all duration-150 hover:border-mist/50 hover:bg-mist/10"
            >
              wróć do Wyroczni
            </button>
          </div>
        )}
      </JourneyCard>
    </JourneyShell>
  );
}
