"use client";

import { formatRelativeTime } from "@/lib/savesLibraryUtils";

const VISIBILITY_LABELS = {
  private: "prywatne",
  shared: "dla wybranych",
  public: "publiczne",
};

export function NoteCard({ note, shareNicks, onEdit, onDelete }) {
  return (
    <article className="pracownia-note pracownia-note--owned">
      <div className="pracownia-note__top">
        <span className="pracownia-vis pracownia-vis--note">
          {VISIBILITY_LABELS[note.visibility] ?? note.visibility}
        </span>
        <span className="pracownia-note__meta">
          {formatRelativeTime(note.updated_at ?? note.created_at)}
        </span>
      </div>
      {note.title ? (
        <p className="pracownia-note__title">{note.title}</p>
      ) : null}
      <p className="pracownia-note__body">{note.body}</p>
      {note.visibility === "shared" && shareNicks?.length ? (
        <p className="pracownia-note__shares">
          Dla: {shareNicks.map((s) => s.nick).join(", ")}
        </p>
      ) : null}
      {note.visibility === "public" ? (
        <p className="pracownia-note__hint">
          Widoczne na publicznej konstelacji — bez feedu.
        </p>
      ) : null}
      {!onEdit && !onDelete ? null : (
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
      )}
    </article>
  );
}
