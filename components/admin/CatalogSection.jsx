"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminCard, AdminKick } from "@/components/admin/AdminShell";
import { ImportSection } from "@/components/admin/ImportSection";

function truncate(text, max = 120) {
  if (!text) return "—";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function PrzesilenieRow({ item }) {
  const beats = Array.isArray(item.beats) ? item.beats : [];
  const firstBeat = beats[0]?.txt;

  return (
    <div className="rounded-[10px] border border-brass/20 bg-brass/5 p-3">
      <p className="font-sans text-[10px] text-brass">
        id {item.id} · oś {item.axis} ({item.axisLabel}) · wariant {item.variant}
      </p>
      <p className="mt-1 font-serif text-sm text-[#ece6d8]">
        {item.value_a} ↔ {item.value_b}
      </p>
      {firstBeat ? (
        <p className="mt-1.5 font-sans text-xs italic text-mistsoft">
          Takt 1: {truncate(firstBeat, 160)}
        </p>
      ) : null}
      <p className="mt-1 font-sans text-[11px] text-mist">
        Wybory: „{item.choice_a}" / „{item.choice_b}"
      </p>
      <p className="mt-1 font-serif text-xs italic text-mistsoft">
        Pointa: {truncate(item.pointa, 140)}
      </p>
      <p className="mt-1 font-sans text-[10px] text-mistsoft">
        {item.beatCount ?? beats.length} taktów w beats
      </p>
    </div>
  );
}

function TowerRow({ item }) {
  return (
    <div className="rounded-[10px] border border-brass/20 bg-brass/5 p-3">
      <p className="font-sans text-[10px] text-brass">
        id {item.id} · oś {item.axis} ({item.axisLabel}) · wariant {item.variant}
      </p>
      <p className="mt-1 font-sans text-xs text-mistsoft">
        Cytaty: [{item.quote_ids?.join(", ")}]
      </p>
      <p className="mt-1.5 font-serif text-sm italic text-[#ece6d8]">
        {truncate(item.meta_gloss, 200)}
      </p>
    </div>
  );
}

function GlosaRow({ item }) {
  const quote = item.quotes;
  return (
    <div className="rounded-[10px] border border-brass/20 bg-brass/5 p-3">
      <p className="font-sans text-[10px] text-brass">
        id {item.id} · quote_id {item.quote_id}
        {item.angle ? ` · ${item.angle}` : ""}
      </p>
      {quote ? (
        <p className="mt-1 font-sans text-[11px] text-mistsoft">
          „{truncate(quote.text, 80)}" — {quote.author ?? "?"}
        </p>
      ) : null}
      <p className="mt-1 font-serif text-sm italic text-[#ece6d8]">
        {truncate(item.glosa, 180)}
      </p>
    </div>
  );
}

function CienRow({ item }) {
  return (
    <div className="rounded-[10px] border border-brass/20 bg-brass/5 p-3">
      <p className="font-sans text-[10px] text-brass">
        quote_id {item.id} · {item.author ?? "?"}
      </p>
      <p className="mt-1 font-sans text-[11px] text-mistsoft">
        „{truncate(item.text, 90)}"
      </p>
      <p className="mt-2 rounded-lg border border-mist/20 bg-black/20 px-2.5 py-2 font-serif text-xs italic text-[#b8c0d4]">
        {truncate(item.cien, 220)}
      </p>
    </div>
  );
}

function RecordList({ type, items }) {
  if (!items.length) {
    return (
      <p className="font-sans text-sm italic text-mistsoft">
        Brak zapisów w bazie — zaimportuj plik .xlsx powyżej.
      </p>
    );
  }

  return (
    <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
      {items.map((item) => {
        if (type === "przesilenie") {
          return <PrzesilenieRow key={item.id} item={item} />;
        }
        if (type === "towers") {
          return <TowerRow key={item.id} item={item} />;
        }
        if (type === "glosses") {
          return <GlosaRow key={item.id} item={item} />;
        }
        return <CienRow key={item.id} item={item} />;
      })}
    </div>
  );
}

const LIST_LABELS = {
  glosses: "Zapisane glosy",
  towers: "Zapisane wieże",
  przesilenie: "Zapisane przesilenia",
  cienie: "Cytaty z cieniem",
};

export function CatalogSection({
  password,
  type,
  title,
  description,
  summary,
  onSummary,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, type }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nie udało się załadować listy.");
        setItems([]);
        return;
      }

      setItems(data.items ?? []);
    } catch {
      setError("Błąd połączenia.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [password, type]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function handleImportSummary(data) {
    onSummary(data);
    if ((data?.added ?? 0) > 0 || (data?.updated ?? 0) > 0) {
      void loadItems();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ImportSection
        password={password}
        type={type}
        title={title}
        description={description}
        summary={summary}
        onSummary={handleImportSummary}
      />

      <AdminCard dark>
        <div className="mb-3 flex items-center justify-between gap-2">
          <AdminKick dark>{LIST_LABELS[type]}</AdminKick>
          <span className="font-sans text-[10px] text-mistsoft">
            {items.length} {items.length === 1 ? "wpis" : "wpisów"}
          </span>
        </div>

        {loading ? (
          <p className="font-sans text-sm italic text-mistsoft">Ładuję…</p>
        ) : null}
        {error ? (
          <p className="mb-2 font-sans text-xs text-tension">{error}</p>
        ) : null}

        {!loading ? <RecordList type={type} items={items} /> : null}

        <button
          type="button"
          onClick={() => void loadItems()}
          className="mt-3 w-full rounded-[11px] border border-mist/30 bg-transparent px-3 py-2 font-sans text-[12px] text-mistsoft transition-colors hover:border-mist/50 hover:bg-mist/10"
        >
          odśwież listę
        </button>
      </AdminCard>
    </div>
  );
}
