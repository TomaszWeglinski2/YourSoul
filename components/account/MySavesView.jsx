"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { fetchMySavedData, setDisplayName } from "@/lib/userData";
import {
  collectionDupCounts,
  filterCollections,
  filterMargins,
  filterReactions,
  groupCollectionsByAuthor,
  pluralPl,
  reactionLabel,
  sortCollections,
} from "@/lib/savesLibraryUtils";
import {
  DisplayNameForm,
  KonstelacjaPane,
  MarginCard,
  ProfileCard,
  QuoteCard,
  ResonanceCard,
  SavesLibraryFooter,
  SavesStickyBar,
  SimpleListPane,
} from "@/components/saves-library/SavesLibraryUI";
import { JourneyShell } from "@/components/journey/JourneyShell";

const TABS = [
  { id: "konst", label: "Konstelacja" },
  { id: "marg", label: "Marginesy" },
  { id: "rez", label: "Rezonanse" },
];

export function MySavesView() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, displayName, refreshDisplayName } =
    useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState("");

  const [tab, setTab] = useState("konst");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("new");
  const [groupByAuthor, setGroupByAuthor] = useState(false);

  const load = useCallback(async ({ soft = false } = {}) => {
    if (soft) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    const result = await fetchMySavedData();
    if (!result.ok) {
      setError(result.error);
      setData(null);
    } else {
      setData(result);
    }

    if (soft) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, []);

  async function handleSaveDisplayName() {
    setNameSaving(true);
    setNameMessage("");
    const result = await setDisplayName(nameInput);
    if (!result.ok) {
      setNameMessage(result.error);
      setNameSaving(false);
      return;
    }
    await refreshDisplayName();
    setNameMessage("Nazwa zapisana.");
    await load({ soft: true });
    setNameSaving(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/logowanie?next=/moje-zapisy");
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load, router]);

  const collections = data?.collections ?? [];
  const margins = data?.margins ?? [];
  const reactions = data?.reactions ?? [];

  const dupCounts = useMemo(() => collectionDupCounts(collections), [collections]);

  const filteredKonst = useMemo(() => {
    const filtered = filterCollections(collections, search);
    return sortCollections(filtered, sort);
  }, [collections, search, sort]);

  const filteredMarg = useMemo(
    () => filterMargins(margins, search),
    [margins, search]
  );

  const filteredRez = useMemo(
    () => filterReactions(reactions, search),
    [reactions, search]
  );

  const counts = {
    konst: collections.length,
    marg: margins.length,
    rez: reactions.length,
  };

  const konstItemProps = useMemo(
    () => ({
      render: (row, dups) => {
        const key = `${row.quotes?.author ?? ""}|${row.quotes?.text ?? ""}`;
        return (
          <QuoteCard
            key={row.id}
            author={row.quotes?.author}
            text={row.quotes?.text ?? `cytat #${row.quote_id}`}
            createdAt={row.created_at}
            dupCount={dups?.[key]}
          />
        );
      },
      grouped: groupCollectionsByAuthor,
    }),
    []
  );

  if (authLoading || (!isAuthenticated && !error)) {
    return null;
  }

  return (
    <JourneyShell wide>
      <div className="saves-lib">
        <header className="sl-head">
          <p className="sl-kick">Twoje zapisy w bazie</p>
          <h1 className="sl-title">Moje zapisy</h1>
          <p className="sl-sub">
            {displayName ? (
              <>
                Jesteś w społeczności jako <b>{displayName}</b>
              </>
            ) : (
              <>Podgląd tego, co Supabase zapisało na Twoim koncie.</>
            )}
            {data?.email ? (
              <span className="block mt-1 text-mistsoft">Konto: {data.email}</span>
            ) : null}
          </p>
        </header>

        {loading ? (
          <p className="px-0.5 font-sans text-sm italic text-mistsoft">Ładuję…</p>
        ) : null}

        {error ? (
          <p className="mb-3 px-0.5 font-sans text-xs text-tension">{error}</p>
        ) : null}

        {data && !loading ? (
          <>
            <ProfileCard profile={data.profile} displayName={displayName} />

            {!displayName ? (
              <DisplayNameForm
                value={nameInput}
                onChange={setNameInput}
                onSave={() => void handleSaveDisplayName()}
                saving={nameSaving}
                message={nameMessage}
              />
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
                items={filteredKonst}
                total={collections.length}
                search={search}
                sort={sort}
                onSortChange={setSort}
                groupByAuthor={groupByAuthor}
                onGroupToggle={() => setGroupByAuthor((v) => !v)}
                dupCounts={dupCounts}
                getItemProps={konstItemProps}
                emptySearch={{
                  icon: "⌕",
                  title: "Nic nie pasuje",
                  description: "Spróbuj innego słowa albo wyczyść wyszukiwanie.",
                }}
                emptyDefault={{
                  icon: "✦",
                  title: "Pusto w konstelacji",
                  description:
                    'Brak zapisanych cytatów — kliknij „to zostaje ze mną" przy cytacie w Wyroczni.',
                }}
              />
            </div>

            <div className={tab === "marg" ? "" : "sl-hidden"}>
              <SimpleListPane
                items={filteredMarg}
                total={margins.length}
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

            <div className={tab === "rez" ? "" : "sl-hidden"}>
              <SimpleListPane
                items={filteredRez}
                total={reactions.length}
                search={search}
                countLabel={(n) => (
                  <>
                    <b>{n}</b> {pluralPl(n, "rezonans", "rezonanse", "rezonansów")}
                  </>
                )}
                renderItem={(row) => (
                  <ResonanceCard
                    key={row.id}
                    title={reactionLabel(row)}
                    subtitle={
                      row.margins?.quotes?.author
                        ? `autor cytatu: ${row.margins.quotes.author}`
                        : null
                    }
                    createdAt={row.created_at}
                  />
                )}
                emptySearch={{
                  icon: "✦",
                  title: "Brak pasujących rezonansów",
                  description: "Spróbuj innego słowa albo wyczyść wyszukiwanie.",
                }}
                emptyDefault={{
                  icon: "✦",
                  title: "Cisza",
                  description:
                    "Rezonans to znak, że ktoś poczuł to samo co Ty przy publicznym marginesie.",
                }}
              />
            </div>

            <SavesLibraryFooter
              onRefresh={() => void load({ soft: true })}
              refreshing={refreshing}
              links={[
                { href: "/zaproszenia", label: "Zaproszenia i zaufanie" },
                { href: "/drzewo", label: "Publiczne drzewo poleceń" },
                { href: "/wyrocznia", label: "Wróć do Wyroczni" },
              ]}
            />
          </>
        ) : null}
      </div>
    </JourneyShell>
  );
}
