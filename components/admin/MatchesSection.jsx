"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminButton,
  AdminCard,
  AdminKick,
} from "@/components/admin/AdminShell";

export function MatchesSection({ password }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/matches/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nie udało się wczytać metryk.");
        setMetrics([]);
        return;
      }

      setMetrics(data.metrics ?? []);
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  async function handleRun() {
    setRunning(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/matches/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, topK: 10 }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Przeliczenie nie powiodło się.");
        return;
      }

      setMessage(`Nowa partia: ${data.matchBatchId}`);
      await loadMetrics();
    } catch {
      setError("Błąd połączenia z serwerem.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <AdminCard>
      <AdminKick>Dopasowania ludzi</AdminKick>
      <p className="mb-4 font-sans text-sm leading-relaxed text-inksoft">
        Cron w Supabase:{" "}
        <code className="text-xs">compute_daily_matches(10, NULL)</code> — filtr
        geograficzny domyślnie wyłączony. Precision@K mierzy rezonans na
        publicznych marginesach dopasowanych osób.
      </p>

      <AdminButton
        disabled={running}
        onClick={() => void handleRun()}
        className="mb-4"
      >
        {running ? "Przeliczam…" : "Przelicz dopasowania teraz"}
      </AdminButton>

      {message ? (
        <p className="mb-3 font-sans text-xs text-inksoft">{message}</p>
      ) : null}
      {error ? (
        <p className="mb-3 font-sans text-xs text-tension">{error}</p>
      ) : null}

      <h2 className="mb-2 font-serif text-lg text-ink">Precision@K</h2>
      {loading ? (
        <p className="font-sans text-xs italic text-inksoft">Ładuję…</p>
      ) : metrics.length === 0 ? (
        <p className="font-sans text-xs text-inksoft">
          Brak metryk — uruchom SQL i pierwsze przeliczenie.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-sans text-xs text-inksoft">
            <thead>
              <tr className="border-b border-brass/20 text-left">
                <th className="py-2 pr-3">Partia</th>
                <th className="py-2 pr-3">K</th>
                <th className="py-2 pr-3">Użytk.</th>
                <th className="py-2 pr-3">Trafienia</th>
                <th className="py-2 pr-3">P@K</th>
                <th className="py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row) => (
                <tr key={row.id} className="border-b border-brass/10">
                  <td className="py-2 pr-3 font-mono text-[10px]">
                    {String(row.match_batch_id).slice(0, 8)}…
                  </td>
                  <td className="py-2 pr-3">{row.k}</td>
                  <td className="py-2 pr-3">{row.users_evaluated}</td>
                  <td className="py-2 pr-3">{row.hits}</td>
                  <td className="py-2 pr-3">
                    {(row.precision_at_k * 100).toFixed(1)}%
                  </td>
                  <td className="py-2">
                    {new Date(row.computed_at).toLocaleString("pl-PL")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
