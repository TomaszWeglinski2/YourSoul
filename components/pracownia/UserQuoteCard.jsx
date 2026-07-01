"use client";

import { formatRelativeTime } from "@/lib/savesLibraryUtils";

export function UserQuoteCard({
  quote,
  ownerNick,
  readOnly = false,
  onEdit,
  onDelete,
}) {
  const isOwn = quote.kind === "own";
  const label = isOwn
    ? `słowa ${ownerNick ?? "podróżnika"}`
    : `znalezione przez ${ownerNick ?? "podróżnika"}`;

  return (
    <article
      className={`pracownia-uquote ${isOwn ? "pracownia-uquote--own" : "pracownia-uquote--found"}`}
    >
      <div className="pracownia-uquote__head">
        <span className="pracownia-uquote__badge" aria-hidden="true">
          {isOwn ? "✎" : "◇"}
        </span>
        <span className="pracownia-uquote__label">{label}</span>
        {!readOnly ? (
          <span className="pracownia-vis pracownia-vis--quote">
            {quote.visibility === "public" ? "publiczne" : "prywatne"}
          </span>
        ) : null}
      </div>

      <blockquote className="pracownia-uquote__text">{quote.text}</blockquote>

      {!isOwn && (quote.author || quote.source) ? (
        <p className="pracownia-uquote__attrib">
          {quote.author ? `— ${quote.author}` : null}
          {quote.author && quote.source ? ", " : null}
          {quote.source ? quote.source : null}
        </p>
      ) : null}

      <p className="pracownia-uquote__meta">
        {formatRelativeTime(quote.created_at)}
        {!readOnly && quote.visibility === "public" ? (
          <span className="pracownia-uquote__public-hint">
            {" "}
            · na publicznej konstelacji
          </span>
        ) : null}
      </p>

      {!readOnly && (onEdit || onDelete) ? (
        <div className="pracownia-card-actions">
          {onEdit ? (
            <button type="button" className="pracownia-btn-ghost" onClick={onEdit}>
              edytuj
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="pracownia-btn-ghost pracownia-btn-ghost--danger"
              onClick={onDelete}
            >
              usuń
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
