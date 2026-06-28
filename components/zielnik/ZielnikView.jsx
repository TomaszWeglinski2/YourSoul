"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { lastName, normalizeStarFromDb, normalizeThreadFromDb } from "@/lib/constellationMath";
import { fetchZielnikData } from "@/lib/userData";
import {
  filterNici,
  filterZielnikMargins,
  filterZielnikStars,
  groupStarsByAuthor,
  marginsListFromMap,
  pluralPl,
  sortZielnikStars,
} from "@/lib/savesLibraryUtils";
import { useAuth } from "@/context/AuthContext";
import { useJourney } from "@/context/JourneyContext";
import {
  KonstelacjaPane,
  MarginCard,
  QuoteCard,
  ResonanceCard,
  SavesLibraryFooter,
  SavesStickyBar,
  SimpleListPane,
  SavesEmptyState,
} from "@/components/saves-library/SavesLibraryUI";
import { BrassButton, JourneyShell } from "@/components/journey/JourneyShell";

const TABS = [
  { id: "konst", label: "Konstelacja" },
  { id: "marg", label: "Marginesy" },
  { id: "nici", label: "Nici" },
];

function ZielnikQuoteCard({ star, margin }) {
  const [shadowVisible, setShadowVisible] = useState(false);
  const hasMargin = Boolean(margin?.body?.trim());
  const canRevealShadow = hasMargin && star.cien;

  const extra = (
    <>
      {star.g ? <p className="sl-gloss">{star.g}</p> : null}
      {hasMargin ? (
        <p className="mt-2 text-[12px] text-mistsoft">
          Twój margines · {margin.visibility === "public" ? "publiczny" : "prywatny"}
        </p>
      ) : null}
      {canRevealShadow && !shadowVisible ? (
        <button
          type="button"
          className="sl-shadow-btn"
          onClick={() => setShadowVisible(true)}
        >
          ✦ odsłoń cień
        </button>
      ) : null}
      {canRevealShadow && shadowVisible ? (
        <div className="sl-shadow-box">
          <p className="text-[10px] uppercase tracking-[0.14em] text-mistsoft">
            Cień — człowiek za słowem
          </p>
          <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#b8c0d4]">
            {star.cien}
          </p>
        </div>
      ) : null}
    </>
  );

  return (
    <QuoteCard
      author={star.a}
      text={star.t}
      createdAt={star.savedAt}
      extra={extra}
    />
  );
}

export function ZielnikView() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { zielnik, marg, pub } = useJourney();

  const [stars, setStars] = useState([]);
  const [marginsByQuote, setMarginsByQuote] = useState({});
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState("konst");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("new");
  const [groupByAuthor, setGroupByAuthor] = useState(false);

  const loadData = useCallback(
    async ({ soft = false } = {}) => {
      if (soft) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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
            if (!row.quotes) return;
            const star = normalizeStarFromDb(row);
            if (!star.id || seen.has(star.id)) return;
            seen.add(star.id);
            loaded.push({ ...star, savedAt: row.created_at });
          });
          setStars(loaded);
          setMarginsByQuote(result.marginsByQuote ?? {});
          setThreads((result.nici ?? []).map(normalizeThreadFromDb));
          if (result.warning) {
            setError(result.warning);
          }
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

      if (soft) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    },
    [isAuthenticated, zielnik, marg, pub]
  );

  useEffect(() => {
    if (authLoading) return;
    void loadData();
  }, [authLoading, loadData]);

  const marginItems = useMemo(
    () => marginsListFromMap(marginsByQuote, stars),
    [marginsByQuote, stars]
  );

  const starById = useMemo(
    () => Object.fromEntries(stars.map((s) => [String(s.id), s])),
    [stars]
  );

  const filteredStars = useMemo(() => {
    const filtered = filterZielnikStars(stars, search);
    return sortZielnikStars(filtered, sort);
  }, [stars, search, sort]);

  const filteredMargins = useMemo(
    () => filterZielnikMargins(marginItems, search),
    [marginItems, search]
  );

  const filteredThreads = useMemo(
    () => filterNici(threads, search, starById),
    [threads, search, starById]
  );

  const counts = {
    konst: stars.length,
    marg: marginItems.length,
    nici: threads.length,
  };

  const konstItemProps = useMemo(
    () => ({
      render: (star) => (
        <ZielnikQuoteCard
          key={star.id}
          star={star}
          margin={marginsByQuote[star.id] ?? marginsByQuote[String(star.id)]}
        />
      ),
      grouped: groupStarsByAuthor,
    }),
    [marginsByQuote]
  );

  if (authLoading || loading) {
    return (
      <JourneyShell wide>
        <div className="saves-lib">
          <p className="font-sans text-sm italic text-mistsoft">Otwieram zielnik…</p>
        </div>
      </JourneyShell>
    );
  }

  if (stars.length === 0 && threads.length === 0 && marginItems.length === 0) {
    return (
      <JourneyShell wide>
        <div className="saves-lib">
          <header className="sl-head">
            <p className="sl-kick">Twój zielnik</p>
            <h1 className="sl-title">Jeszcze pusto.</h1>
          </header>
          {error ? (
            <p className="mb-3 font-sans text-xs text-tension">{error}</p>
          ) : (
            <SavesEmptyState
              icon="✦"
              title="Zacznij od Wyroczni"
              description="Wróć do Wyroczni, dopisz margines i zachowaj kilka słów. Tu zbierają się Twoje zapiski."
            />
          )}
          {!isAuthenticated ? (
            <p className="mb-4 font-sans text-xs italic text-mistsoft">
              Jesteś niezalogowany — zapisane cytaty w bazie widać dopiero po zalogowaniu.
            </p>
          ) : null}
          <div className="flex flex-col gap-2">
            {error ? (
              <BrassButton onClick={() => void loadData()} className="mt-0">
                spróbuj ponownie
              </BrassButton>
            ) : null}
            {!isAuthenticated ? (
              <BrassButton
                onClick={() => router.push("/logowanie?next=/zielnik")}
                className="mt-0"
              >
                zaloguj się
              </BrassButton>
            ) : null}
            <BrassButton onClick={() => router.push("/wyrocznia")}>
              Do Wyroczni
            </BrassButton>
          </div>
        </div>
      </JourneyShell>
    );
  }

  return (
    <JourneyShell wide>
      <div className="saves-lib">
        <header className="sl-head">
          <p className="sl-kick">Twój zielnik — prywatna antologia</p>
          <h1 className="sl-title">Zielnik</h1>
          <p className="sl-sub">
            Cytaty, marginesy i nici — <b>Twoja osobista ścieżka</b> przez Wyrocznię.
          </p>
        </header>

        {error ? (
          <p className="mb-3 font-sans text-xs text-tension">{error}</p>
        ) : null}

        <SavesStickyBar
          search={search}
          onSearchChange={setSearch}
          activeTab={tab}
          onTabChange={setTab}
          counts={counts}
          tabs={TABS}
        />

        <div className={tab === "konst" ? "" : "sl-hidden"}>
          <KonstelacjaPane
            items={filteredStars}
            total={stars.length}
            search={search}
            sort={sort}
            onSortChange={setSort}
            groupByAuthor={groupByAuthor}
            onGroupToggle={() => setGroupByAuthor((v) => !v)}
            dupCounts={{}}
            getItemProps={konstItemProps}
            emptySearch={{
              icon: "⌕",
              title: "Nic nie pasuje",
              description: "Spróbuj innego słowa albo wyczyść wyszukiwanie.",
            }}
            emptyDefault={{
              icon: "✦",
              title: "Brak cytatów",
              description: "Zachowaj cytaty w Wyroczni — pojawią się tutaj.",
            }}
          />
        </div>

        <div className={tab === "marg" ? "" : "sl-hidden"}>
          <SimpleListPane
            items={filteredMargins}
            total={marginItems.length}
            search={search}
            countLabel={(n) => (
              <>
                <b>{n}</b> {pluralPl(n, "margines", "marginesy", "marginesów")}
              </>
            )}
            renderItem={(row) => (
              <MarginCard
                key={row.id}
                body={row.body}
                quoteText={row.quotes?.text}
                visibility={row.visibility}
                createdAt={row.created_at}
              />
            )}
            emptySearch={{
              icon: "✎",
              title: "Brak pasujących marginesów",
              description: "Spróbuj innego słowa albo wyczyść wyszukiwanie.",
            }}
            emptyDefault={{
              icon: "✎",
              title: "Brak marginesów",
              description: "Marginesy to Twoje własne notatki przy cytatach.",
            }}
          />
        </div>

        <div className={tab === "nici" ? "" : "sl-hidden"}>
          <SimpleListPane
            items={filteredThreads}
            total={threads.length}
            search={search}
            countLabel={(n) => (
              <>
                <b>{n}</b> {pluralPl(n, "nić", "nici", "nici")}
              </>
            )}
            renderItem={(thread, idx) => {
              const qa = starById[thread.a];
              const qb = starById[thread.b];
              const sym = thread.type === "napiecie" ? "↮" : "✦";
              return (
                <ResonanceCard
                  key={thread.id ?? idx}
                  icon={sym}
                  title={`${qa ? lastName(qa.a) : "?"} ${sym} ${qb ? lastName(qb.a) : "?"}`}
                  subtitle={`„${thread.glosa}"`}
                />
              );
            }}
            emptySearch={{
              icon: "⌕",
              title: "Brak pasujących nici",
              description: "Spróbuj innego słowa albo wyczyść wyszukiwanie.",
            }}
            emptyDefault={{
              icon: "↮",
              title: "Brak nici",
              description: "Spinaj cytaty w konstelacji — nici pojawią się tutaj.",
            }}
          />
        </div>

        <p className="mt-4 px-0.5 font-sans text-[11px] italic leading-relaxed text-mistsoft">
          Cień — człowiek za słowem — odsłania się tylko przy cytatach, którym dałeś
          własny margines.
        </p>

        <SavesLibraryFooter
          onRefresh={() => void loadData({ soft: true })}
          refreshing={refreshing}
          links={[
            { href: "/konstelacja", label: "Zobacz konstelację" },
            { href: "/wyrocznia", label: "Wróć do Wyroczni" },
          ]}
        />
      </div>
    </JourneyShell>
  );
}
