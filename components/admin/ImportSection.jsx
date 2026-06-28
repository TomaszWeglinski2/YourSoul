"use client";

import { useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminKick,
  ImportSummary,
} from "@/components/admin/AdminShell";
import { getSampleDescription } from "@/lib/adminSamples";

export function ImportSection({
  password,
  type,
  title,
  description,
  onSummary,
  summary,
}) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sampleLoading, setSampleLoading] = useState(false);

  async function handleImport(event) {
    event.preventDefault();
    if (!file) {
      setError("Wybierz plik .xlsx.");
      return;
    }

    setLoading(true);
    setError("");
    onSummary(null);

    const formData = new FormData();
    formData.append("password", password);
    formData.append("type", type);
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Import nie powiódł się.");
        return;
      }

      onSummary(data);
    } catch {
      setError("Nie udało się wysłać pliku.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSampleDownload() {
    setSampleLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, type }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error ?? "Nie udało się pobrać próbki.");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `your-soul-${type}-przyklad.xlsx`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Nie udało się pobrać próbki.");
    } finally {
      setSampleLoading(false);
    }
  }

  const columns = getSampleDescription(type);

  return (
    <>
      <AdminCard>
        <AdminKick>{title}</AdminKick>
        <p className="mb-3 font-sans text-sm leading-relaxed text-inksoft">
          {description}
        </p>
        {columns ? (
          <p className="mb-4 rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 font-sans text-xs leading-relaxed text-inksoft">
            Kolumny: {columns}
          </p>
        ) : null}

        <AdminButton
          variant="ghost"
          disabled={sampleLoading}
          onClick={() => void handleSampleDownload()}
          className="mb-3"
        >
          {sampleLoading ? "Generuję…" : "Pobierz przykładowy .xlsx"}
        </AdminButton>

        <form onSubmit={(e) => void handleImport(e)} className="flex flex-col gap-3">
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="block w-full font-sans text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-brass/45 file:bg-brass/10 file:px-3 file:py-2 file:text-sm file:text-ink hover:file:border-brass"
          />
          {error ? (
            <p className="font-sans text-xs text-tension">{error}</p>
          ) : null}
          <AdminButton disabled={loading || !file} type="submit">
            {loading ? "Importuję…" : "Importuj z Excela"}
          </AdminButton>
        </form>
      </AdminCard>
      <ImportSummary summary={summary} />
    </>
  );
}
