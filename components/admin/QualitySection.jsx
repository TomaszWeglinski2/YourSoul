"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminKick,
} from "@/components/admin/AdminShell";

export function QualitySection({ password }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "quality" }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nie udało się załadować raportu.");
        return;
      }

      setRows(data.rows ?? []);
    } catch {
      setError("Błąd połączenia.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleHide(quoteId) {
    setActionId(quoteId);

    try {
      const response = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "hide", quoteId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Ukrycie nie powiodło się.");
        return;
      }

      await load();
    } catch {
      setError("Błąd połączenia.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <AdminCard dark>
      <AdminKick dark>Jakość korpusu — tylko redaktor</AdminKick>
      <p className="mb-4 font-sans text-sm leading-relaxed text-mistsoft">
        Wynik = zachowania w collections − zgłoszenia quote_flags. Najsłabsze i
        zgłoszone na górze. „Ukryj" ustawia status = hidden — cytat znika z
        Wyroczni, bez kasowania wiersza.
      </p>

      {loading ? (
        <p className="font-sans text-sm italic text-mistsoft">Ładuję…</p>
      ) : null}
      {error ? (
        <p className="mb-3 font-sans text-xs text-tension">{error}</p>
      ) : null}

      <div className="space-y-2">
        {rows.map((row) => {
          const preview =
            row.text.length > 72 ? `${row.text.slice(0, 72)}…` : row.text;

          return (
            <div
              key={row.id}
              className={`flex flex-wrap items-start justify-between gap-2 rounded-[10px] border px-3 py-2.5 ${
                row.isCandidate
                  ? "border-tension/40 bg-tension/10"
                  : "border-brass/20 bg-brass/5"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[10px] text-brass">
                  id {row.id} · quality {row.quality}
                  {row.flagCount > 0 ? ` · ${row.flagCount} zgł.` : ""}
                </p>
                <p className="font-serif text-sm italic text-[#ece6d8]">
                  „{preview}"
                </p>
                <p className="font-sans text-[11px] text-mistsoft">
                  — {row.author ?? "?"}
                </p>
                {row.isCandidate ? (
                  <p className="mt-1 font-sans text-[10px] uppercase tracking-wide text-tension">
                    Kandydat do usunięcia
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                disabled={actionId === row.id}
                onClick={() => void handleHide(row.id)}
                className="shrink-0 rounded-lg border border-tension/40 px-2.5 py-1.5 font-sans text-[11px] text-[#cdd3ea] transition-colors hover:border-tension hover:bg-tension/20 disabled:opacity-50"
              >
                {actionId === row.id ? "…" : "ukryj"}
              </button>
            </div>
          );
        })}
      </div>

      <AdminButton variant="ghost" onClick={() => void load()} className="mt-4">
        odśwież raport
      </AdminButton>
    </AdminCard>
  );
}
