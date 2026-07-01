"use client";

import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminKick,
} from "@/components/admin/AdminShell";
import { QUOTE_EXPORT_COLUMNS } from "@/lib/adminColumnFormats";
import { getSampleDescription } from "@/lib/adminSamples";

export function ExportSection({
  password,
  type,
  showQuoteFilters = false,
  showAxesPromptExport = false,
}) {
  const [loading, setLoading] = useState(false);
  const [axesLoading, setAxesLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastInfo, setLastInfo] = useState("");
  const [unverifiedOnly, setUnverifiedOnly] = useState(false);
  const [domain, setDomain] = useState("");
  const [createdAfter, setCreatedAfter] = useState("");

  async function downloadExport(exportType, setBusy) {
    setBusy(true);
    setError("");
    setLastInfo("");

    try {
      const filters = {};
      if (showQuoteFilters) {
        if (unverifiedOnly) {
          filters.unverifiedOnly = true;
        }
        if (domain.trim()) {
          filters.domain = domain.trim();
        }
        if (createdAfter) {
          filters.createdAfter = createdAfter;
        }
      }

      const response = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          type: exportType,
          filters: showQuoteFilters ? filters : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Eksport nie powiódł się.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const rowCount = response.headers.get("X-Export-Row-Count");
      const filename = match?.[1] ?? `your-soul-${exportType}.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      setLastInfo(
        rowCount
          ? `Pobrano ${filename} (${rowCount} wierszy).`
          : `Pobrano ${filename}.`
      );
    } catch {
      setError("Nie udało się pobrać pliku.");
    } finally {
      setBusy(false);
    }
  }

  const columns = getSampleDescription(type);
  const exportColumns =
    type === "quotes" ? QUOTE_EXPORT_COLUMNS.join(", ") : columns;

  return (
    <AdminCard dark>
      <AdminKick dark>Eksport z bazy</AdminKick>
      <p className="mb-3 font-sans text-sm leading-relaxed text-mistsoft">
        Pobierz aktualną zawartość bazy jako .xlsx — te same kolumny co przy
        imporcie (plus <code className="text-brass">id</code> przy cytatach), żeby
        edycja i re-import działały bez tarcia.
      </p>

      {exportColumns ? (
        <p className="mb-4 rounded-lg border border-brass/20 bg-black/20 px-3 py-2 font-sans text-xs leading-relaxed text-mistsoft">
          Kolumny: {exportColumns}
        </p>
      ) : null}

      {showQuoteFilters ? (
        <div className="mb-4 space-y-3 rounded-lg border border-mist/20 bg-black/20 p-3">
          <p className="font-sans text-[10px] uppercase tracking-wide text-brass">
            Filtry (opcjonalne)
          </p>
          <label className="flex items-center gap-2 font-sans text-xs text-mistsoft">
            <input
              type="checkbox"
              checked={unverifiedOnly}
              onChange={(event) => setUnverifiedOnly(event.target.checked)}
              className="accent-brass"
            />
            tylko source_verified = false (do sprawdzenia)
          </label>
          <label className="block font-sans text-xs text-mistsoft">
            Tylko domena (dom)
            <input
              type="text"
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="np. Filozofia"
              className="mt-1 w-full rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2 text-sm text-[#ece6d8] placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
            />
          </label>
          <label className="block font-sans text-xs text-mistsoft">
            Dodane po dacie (created_at)
            <input
              type="date"
              value={createdAfter}
              onChange={(event) => setCreatedAfter(event.target.value)}
              className="mt-1 w-full rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2 text-sm text-[#ece6d8] focus:border-brass focus:outline-none"
            />
          </label>
        </div>
      ) : null}

      <AdminButton
        disabled={loading}
        onClick={() => void downloadExport(type, setLoading)}
        className="mb-2"
      >
        {loading ? "Generuję plik…" : "Pobierz z bazy jako .xlsx"}
      </AdminButton>

      {showAxesPromptExport ? (
        <AdminButton
          variant="ghost"
          disabled={axesLoading}
          onClick={() => void downloadExport("quotes-axes-prompt", setAxesLoading)}
          className="mb-2"
        >
          {axesLoading
            ? "Generuję listę…"
            : "Cytaty z osiami (do generowania powiązań)"}
        </AdminButton>
      ) : null}

      {error ? (
        <p className="font-sans text-xs text-tension">{error}</p>
      ) : null}
      {lastInfo ? (
        <p className="mt-2 font-sans text-xs text-mistsoft">{lastInfo}</p>
      ) : null}
    </AdminCard>
  );
}
