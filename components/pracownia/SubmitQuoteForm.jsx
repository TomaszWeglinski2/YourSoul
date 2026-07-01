"use client";

import { useState } from "react";
import { BrassButton } from "@/components/journey/JourneyShell";
import {
  MONTHLY_SUBMISSION_LIMIT,
  MAX_SUBMISSION_WORDS,
} from "@/lib/quoteSubmissionUtils";

export function SubmitQuoteForm({ initial, userQuoteId, onSuccess, onCancel }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [work, setWork] = useState(initial?.source ?? initial?.work ?? "");
  const [year, setYear] = useState(initial?.year ?? "");
  const [publicDomain, setPublicDomain] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/quote-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          author,
          work,
          year,
          public_domain: publicDomain,
          user_quote_id: userQuoteId ?? null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Nie udało się wysłać zgłoszenia.");
        return;
      }

      setSuccess(
        data.message ??
          "Zgłoszenie trafiło do moderacji — cytat nie wchodzi do Wyroczni automatycznie."
      );
      onSuccess?.(data.submission);
    } catch {
      setError("Nie udało się wysłać zgłoszenia.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="pracownia-form pracownia-form--submit" onSubmit={handleSubmit}>
      <p className="pracownia-form__label">Zgłoś do Wyroczni (moderacja)</p>
      <p className="pracownia-form__hint">
        Główny korpus to domena publiczna — zgłoszenie trafi do redakcji, nie
        od razu do losowań. Limit: {MONTHLY_SUBMISSION_LIMIT} zgłoszeń miesięcznie,
        max {MAX_SUBMISSION_WORDS} słów.
      </p>

      <label className="pracownia-form__field">
        <span className="pracownia-form__label">Treść</span>
        <textarea
          className="pracownia-textarea pracownia-textarea--quote"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          required
        />
      </label>

      <label className="pracownia-form__field">
        <span className="pracownia-form__label">Autor</span>
        <input
          className="pracownia-input"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          required
        />
      </label>

      <label className="pracownia-form__field">
        <span className="pracownia-form__label">Źródło (np. tytuł dzieła)</span>
        <input
          className="pracownia-input"
          value={work}
          onChange={(e) => setWork(e.target.value)}
        />
      </label>

      <label className="pracownia-form__field">
        <span className="pracownia-form__label">Rok (opcjonalnie)</span>
        <input
          className="pracownia-input"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>

      <label className="pracownia-vis-option pracownia-form__field">
        <input
          type="checkbox"
          checked={publicDomain}
          onChange={(e) => setPublicDomain(e.target.checked)}
          className="accent-brass"
        />
        Autor zmarł ponad 70 lat temu (domena publiczna)
      </label>

      {error ? <p className="pracownia__error">{error}</p> : null}
      {success ? <p className="pracownia-form__hint text-mist">{success}</p> : null}

      <div className="pracownia-form__actions">
        <button type="button" className="pracownia-btn-ghost" onClick={onCancel}>
          anuluj
        </button>
        <BrassButton type="submit" disabled={saving} className="mt-0 w-auto px-5">
          {saving ? "Wysyłam…" : "wyślij do moderacji"}
        </BrassButton>
      </div>
    </form>
  );
}
