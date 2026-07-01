"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AXIS_STEP_VALUES,
  CALIBRATION_ANCHORS,
  axisLabel,
} from "@/lib/adminCalibrationAnchors";
import { AXIS_KEYS } from "@/lib/importQuotes";
import { EXPECTED_COLUMNS } from "@/lib/importQuotes";
import {
  AdminButton,
  AdminCard,
  AdminKick,
} from "@/components/admin/AdminShell";
import { ImportSection } from "@/components/admin/ImportSection";

function AxisStepper({ label, value, onChange }) {
  return (
    <div className="mb-2">
      <p className="mb-1 font-sans text-[10px] uppercase tracking-wide text-mistsoft">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {AXIS_STEP_VALUES.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(step)}
            className={`rounded-md border px-2 py-1 font-sans text-[11px] transition-colors ${
              value === step
                ? "border-brass bg-brass text-[#fff8ec]"
                : "border-brass/30 bg-transparent text-mist hover:border-brass/60"
            }`}
          >
            {step > 0 ? `+${step}` : step}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuoteRow({ quote, password, onSaved }) {
  const [axes, setAxes] = useState(quote.axes);
  const [verified, setVerified] = useState(Boolean(quote.source_verified));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          action: "update",
          id: quote.id,
          axes,
          source_verified: verified,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error ?? "Zapis nie powiódł się.");
        return;
      }

      setMessage("Zapisano.");
      onSaved();
    } catch {
      setMessage("Błąd połączenia.");
    } finally {
      setSaving(false);
    }
  }

  const preview =
    quote.text.length > 90 ? `${quote.text.slice(0, 90)}…` : quote.text;

  return (
    <div className="rounded-[10px] border border-brass/20 bg-brass/5 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
      >
        <p className="font-sans text-[10px] text-brass">id {quote.id}</p>
        <p className="font-serif text-sm italic text-[#ece6d8]">„{preview}"</p>
        <p className="mt-0.5 font-sans text-[11px] text-mistsoft">
          {quote.author ?? "—"} · quality {quote.quality ?? 0}
          {verified ? " · zweryfikowany" : ""}
        </p>
      </button>

      {open ? (
        <div className="mt-3 border-t border-brass/20 pt-3">
          {AXIS_KEYS.map((key, index) => (
            <AxisStepper
              key={key}
              label={axisLabel(index)}
              value={axes[index]}
              onChange={(step) => {
                setAxes((prev) => {
                  const next = [...prev];
                  next[index] = step;
                  return next;
                });
              }}
            />
          ))}
          <label className="mt-2 flex items-center gap-2 font-sans text-xs text-mistsoft">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="accent-brass"
            />
            source_verified
          </label>
          {message ? (
            <p className="mt-2 font-sans text-xs text-mistsoft">{message}</p>
          ) : null}
          <AdminButton
            disabled={saving}
            onClick={() => void handleSave()}
            className="mt-2"
          >
            {saving ? "Zapisuję…" : "Zapisz osie"}
          </AdminButton>
        </div>
      ) : null}
    </div>
  );
}

export function QuotesSection({ password }) {
  const [importSummary, setImportSummary] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          action: "list",
          search,
          limit: 80,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nie udało się załadować cytatów.");
        return;
      }

      setQuotes(data.quotes ?? []);
    } catch {
      setError("Błąd połączenia.");
    } finally {
      setLoading(false);
    }
  }, [password, search]);

  useEffect(() => {
    void loadQuotes();
  }, [loadQuotes]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="flex flex-col gap-4">
        <ImportSection
          password={password}
          type="quotes"
          title="Import cytatów"
          description="Wgraj .xlsx z korpussem. Wiersz z id aktualizuje cytat; bez id — INSERT lub UPDATE po text+author (bez duplikatów). Po imporcie możesz skorygować osie suwakami poniżej."
          summary={importSummary}
          onSummary={(data) => {
            setImportSummary(data);
            if ((data?.added ?? 0) > 0 || (data?.updated ?? 0) > 0) {
              void loadQuotes();
            }
          }}
        />

        <AdminCard dark>
          <AdminKick dark>Edycja osi — ostatnie cytaty</AdminKick>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj w treści…"
            className="mb-3 w-full rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2 font-sans text-sm text-[#ece6d8] placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
          />
          <p className="mb-3 font-sans text-[10px] text-mistsoft">
            Kolumny importu: id (opcjonalne), {EXPECTED_COLUMNS.join(", ")}
          </p>
          {loading ? (
            <p className="font-sans text-sm italic text-mistsoft">Ładuję…</p>
          ) : null}
          {error ? (
            <p className="font-sans text-xs text-tension">{error}</p>
          ) : null}
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {quotes.map((quote) => (
              <QuoteRow
                key={quote.id}
                quote={quote}
                password={password}
                onSaved={loadQuotes}
              />
            ))}
          </div>
        </AdminCard>
      </div>

      <AdminCard dark className="h-fit lg:sticky lg:top-4">
        <AdminKick dark>15 kotwic kalibracyjnych</AdminKick>
        <p className="mb-3 font-sans text-[11px] leading-relaxed text-mistsoft">
          Stałe odniesienie przy ustawianiu osi — porównaj swój cytat z kotwicą
          na tej samej osi.
        </p>
        <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
          {CALIBRATION_ANCHORS.map((anchor) => (
            <div
              key={anchor.label}
              className="rounded-lg border border-brass/15 bg-black/20 px-2.5 py-2"
            >
              <p className="font-sans text-[10px] uppercase tracking-wide text-brass">
                {anchor.label}
              </p>
              <p className="mt-0.5 font-serif text-[12px] italic leading-snug text-mist">
                „{anchor.text}"
              </p>
              <p className="mt-1 font-mono text-[9px] text-mistsoft">
                [{anchor.axes.map((v) => v.toFixed(1)).join(", ")}]
              </p>
            </div>
          ))}
        </div>
      </AdminCard>
    </div>
  );
}
