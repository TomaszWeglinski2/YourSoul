"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AXIS_STEP_VALUES,
  axisLabel,
} from "@/lib/adminCalibrationAnchors";
import { AXIS_KEYS } from "@/lib/importQuotes";
import {
  AdminButton,
  AdminCard,
  AdminKick,
} from "@/components/admin/AdminShell";

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

function SubmissionRow({ row, password, onDone }) {
  const [mode, setMode] = useState(null);
  const [axes, setAxes] = useState([0, 0, 0, 0, 0]);
  const [rejectNote, setRejectNote] = useState("");
  const [acceptNote, setAcceptNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleReject() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          action: "reject",
          id: row.id,
          reviewerNote: rejectNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Odrzucenie nie powiodło się.");
        return;
      }
      onDone();
    } catch {
      setMessage("Błąd połączenia.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          action: "accept",
          id: row.id,
          axes,
          reviewerNote: acceptNote || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error ?? "Akceptacja nie powiodła się.");
        return;
      }
      setMessage(`Przyjęto — cytat id ${data.quote?.id} w korpusie.`);
      setTimeout(() => onDone(), 800);
    } catch {
      setMessage("Błąd połączenia.");
    } finally {
      setBusy(false);
    }
  }

  const preview =
    row.text.length > 120 ? `${row.text.slice(0, 120)}…` : row.text;

  return (
    <div className="rounded-[10px] border border-brass/20 bg-brass/5 p-3">
      <p className="font-sans text-[10px] text-brass">
        zgłoszenie #{row.id}
        {row.nick ? ` · zaproponował ${row.nick}` : " · podróżnik bez nicku"}
      </p>
      <p className="mt-1 font-serif text-sm italic text-[#ece6d8]">„{preview}"</p>
      <p className="mt-1 font-sans text-[11px] text-mistsoft">
        {row.author ?? "—"}
        {row.work ? ` · ${row.work}` : ""}
        {row.year ? ` · ${row.year}` : ""}
        {row.public_domain ? " · domena publiczna" : ""}
      </p>

      {!mode ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminButton type="button" onClick={() => setMode("accept")}>
            Zaakceptuj
          </AdminButton>
          <button
            type="button"
            onClick={() => setMode("reject")}
            className="rounded-[10px] border border-tension/40 px-3 py-2 font-sans text-xs text-tension hover:bg-tension/10"
          >
            Odrzuć
          </button>
        </div>
      ) : null}

      {mode === "reject" ? (
        <div className="mt-3 space-y-2">
          <label className="block font-sans text-[10px] uppercase tracking-wide text-mistsoft">
            Powód odrzucenia
          </label>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            className="w-full rounded-[10px] border border-brass/30 bg-white/40 px-3 py-2 font-sans text-sm text-ink"
            placeholder="Krótko dla siebie / ewentualnie widoczne graczowi w statusie"
          />
          <div className="flex flex-wrap gap-2">
            <AdminButton
              type="button"
              disabled={busy || !rejectNote.trim()}
              onClick={() => void handleReject()}
            >
              {busy ? "Zapisuję…" : "Potwierdź odrzucenie"}
            </AdminButton>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="font-sans text-xs text-mistsoft hover:text-brass"
            >
              anuluj
            </button>
          </div>
        </div>
      ) : null}

      {mode === "accept" ? (
        <div className="mt-3 space-y-2">
          <p className="font-sans text-[11px] text-mistsoft">
            Nadaj 5 osi ręcznie — bez tego cytat nie trafi sensownie do dopasowań.
          </p>
          {AXIS_KEYS.map((key, index) => (
            <AxisStepper
              key={key}
              label={axisLabel(key)}
              value={axes[index]}
              onChange={(value) =>
                setAxes((prev) => {
                  const next = [...prev];
                  next[index] = value;
                  return next;
                })
              }
            />
          ))}
          <label className="block font-sans text-[10px] uppercase tracking-wide text-mistsoft">
            Notatka redaktora (opcjonalnie)
          </label>
          <input
            value={acceptNote}
            onChange={(e) => setAcceptNote(e.target.value)}
            className="w-full rounded-[10px] border border-brass/30 bg-white/40 px-3 py-2 font-sans text-sm text-ink"
          />
          <div className="flex flex-wrap gap-2">
            <AdminButton
              type="button"
              disabled={busy}
              onClick={() => void handleAccept()}
            >
              {busy ? "Zapisuję…" : "Utwórz cytat w korpusie"}
            </AdminButton>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="font-sans text-xs text-mistsoft hover:text-brass"
            >
              anuluj
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="mt-2 font-sans text-xs text-mistsoft">{message}</p>
      ) : null}
    </div>
  );
}

export function SubmissionsSection({ password }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "list" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Nie udało się wczytać zgłoszeń.");
        setRows([]);
        return;
      }
      setRows(data.submissions ?? []);
    } catch {
      setError("Błąd połączenia.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminCard>
      <AdminKick>Zgłoszenia graczy</AdminKick>
      <h2 className="mb-2 font-serif text-xl text-ink">Moderacja → korpus</h2>
      <p className="mb-4 font-sans text-sm text-inksoft">
        Zgłoszenia nie trafiają automatycznie do Wyroczni. Akceptacja wymaga
        ręcznego nadania 5 osi.
      </p>

      {loading ? (
        <p className="font-sans text-sm italic text-mistsoft">Ładuję…</p>
      ) : null}
      {error ? <p className="font-sans text-xs text-tension">{error}</p> : null}

      {!loading && rows.length === 0 ? (
        <p className="font-sans text-sm text-mistsoft">Brak oczekujących zgłoszeń.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <SubmissionRow
              key={row.id}
              row={row}
              password={password}
              onDone={() => void load()}
            />
          ))}
        </div>
      )}
    </AdminCard>
  );
}
