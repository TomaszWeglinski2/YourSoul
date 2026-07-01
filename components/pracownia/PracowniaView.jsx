"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { NoteCard } from "@/components/pracownia/NoteCard";
import { UserQuoteCard } from "@/components/pracownia/UserQuoteCard";
import { BrassButton, JourneyCard, JourneyShell } from "@/components/journey/JourneyShell";
import { useAuth } from "@/context/AuthContext";
import {
  createNote,
  createUserQuote,
  deleteNote,
  deleteUserQuote,
  fetchMyNotes,
  fetchMyUserQuotes,
  fetchNoteShareNicks,
  searchTravelerNicks,
  updateNote,
  updateUserQuote,
} from "@/lib/pracowniaData";

const TABS = [
  { id: "mysli", label: "Moje myśli" },
  { id: "cytaty", label: "Moje cytaty" },
];

function ShareNickPicker({ selected, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      void searchTravelerNicks(query).then((res) => {
        if (cancelled) return;
        setResults(res.ok ? res.results : []);
        setSearching(false);
      });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function addPerson(person) {
    if (selected.some((s) => s.user_id === person.user_id)) {
      return;
    }
    onChange([...selected, person]);
    setQuery("");
    setResults([]);
  }

  function removePerson(userId) {
    onChange(selected.filter((s) => s.user_id !== userId));
  }

  return (
    <div className="pracownia-share">
      <p className="pracownia-form__label">Dla wybranych podróżników (nick)</p>
      {selected.length ? (
        <ul className="pracownia-share__chips">
          {selected.map((person) => (
            <li key={person.user_id}>
              <button
                type="button"
                className="pracownia-share__chip"
                onClick={() => removePerson(person.user_id)}
              >
                {person.nick} ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        type="search"
        className="pracownia-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Szukaj nicku (min. 2 znaki)…"
        autoComplete="off"
      />
      {searching ? (
        <p className="pracownia-form__hint">Szukam…</p>
      ) : null}
      {results.length ? (
        <ul className="pracownia-share__results">
          {results.map((person) => (
            <li key={person.user_id}>
              <button
                type="button"
                className="pracownia-share__pick"
                onClick={() => addPerson(person)}
              >
                {person.nick}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function NoteEditor({ initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [visibility, setVisibility] = useState(initial?.visibility ?? "private");
  const [shareTargets, setShareTargets] = useState(initial?.shareTargets ?? []);

  return (
    <form
      className="pracownia-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          title,
          body,
          visibility,
          shareUserIds: shareTargets.map((t) => t.user_id),
        });
      }}
    >
      <label className="pracownia-form__field">
        <span className="pracownia-form__label">Tytuł (opcjonalnie)</span>
        <input
          className="pracownia-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
        />
      </label>
      <label className="pracownia-form__field">
        <span className="pracownia-form__label">Treść</span>
        <textarea
          className="pracownia-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          required
        />
      </label>
      <fieldset className="pracownia-form__field">
        <legend className="pracownia-form__label">Widoczność</legend>
        <div className="pracownia-vis-options">
          {[
            ["private", "prywatne"],
            ["shared", "dla wybranych"],
            ["public", "publiczne"],
          ].map(([value, label]) => (
            <label key={value} className="pracownia-vis-option">
              <input
                type="radio"
                name="note-vis"
                value={value}
                checked={visibility === value}
                onChange={() => setVisibility(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {visibility === "shared" ? (
        <ShareNickPicker selected={shareTargets} onChange={setShareTargets} />
      ) : null}
      {visibility === "public" ? (
        <p className="pracownia-form__hint">
          Publiczne = widoczne na twojej publicznej konstelacji. Bez feedu i
          powiadomień.
        </p>
      ) : null}
      <div className="pracownia-form__actions">
        <button type="button" className="pracownia-btn-ghost" onClick={onCancel}>
          anuluj
        </button>
        <BrassButton type="submit" disabled={saving} className="mt-0 w-auto px-5">
          {saving ? "Zapisuję…" : "zapisz myśl"}
        </BrassButton>
      </div>
    </form>
  );
}

function QuoteEditor({ kind, initial, onSave, onCancel, saving }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [author, setAuthor] = useState(initial?.author ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [visibility, setVisibility] = useState(initial?.visibility ?? "private");
  const isFound = kind === "found";

  return (
    <form
      className="pracownia-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          text,
          author: isFound ? author : null,
          source: isFound ? source : null,
          kind,
          visibility,
        });
      }}
    >
      <label className="pracownia-form__field">
        <span className="pracownia-form__label">
          {isFound ? "Treść cytatu" : "Twój aforyzm"}
        </span>
        <textarea
          className="pracownia-textarea pracownia-textarea--quote"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          required
        />
      </label>
      {isFound ? (
        <>
          <label className="pracownia-form__field">
            <span className="pracownia-form__label">Autor</span>
            <input
              className="pracownia-input"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </label>
          <label className="pracownia-form__field">
            <span className="pracownia-form__label">Źródło (np. tytuł książki)</span>
            <input
              className="pracownia-input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>
        </>
      ) : (
        <p className="pracownia-form__hint">
          Autorem jesteś ty — wpis trafi jako „słowa [twój nick]”.
        </p>
      )}
      <fieldset className="pracownia-form__field">
        <legend className="pracownia-form__label">Widoczność</legend>
        <div className="pracownia-vis-options">
          {[
            ["private", "prywatne"],
            ["public", "publiczne"],
          ].map(([value, label]) => (
            <label key={value} className="pracownia-vis-option">
              <input
                type="radio"
                name="quote-vis"
                value={value}
                checked={visibility === value}
                onChange={() => setVisibility(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="pracownia-form__actions">
        <button type="button" className="pracownia-btn-ghost" onClick={onCancel}>
          anuluj
        </button>
        <BrassButton type="submit" disabled={saving} className="mt-0 w-auto px-5">
          {saving ? "Zapisuję…" : "zapisz cytat"}
        </BrassButton>
      </div>
    </form>
  );
}

export function PracowniaView() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, displayName } = useAuth();

  const [tab, setTab] = useState("mysli");
  const [notes, setNotes] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [shareMap, setShareMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [noteMode, setNoteMode] = useState(null);
  const [quoteMode, setQuoteMode] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [editingQuote, setEditingQuote] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    const [notesRes, quotesRes] = await Promise.all([
      fetchMyNotes(),
      fetchMyUserQuotes(),
    ]);

    const errors = [];
    if (!notesRes.ok) {
      errors.push(notesRes.error ?? "Nie udało się wczytać myśli.");
      setNotes([]);
      setShareMap({});
    } else {
      setNotes(notesRes.notes);
      const sharedNotes = notesRes.notes.filter((n) => n.visibility === "shared");
      const shareEntries = await Promise.all(
        sharedNotes.map(async (note) => {
          const res = await fetchNoteShareNicks(note.id);
          return [note.id, res.ok ? res.shares : []];
        })
      );
      setShareMap(Object.fromEntries(shareEntries));
    }

    if (!quotesRes.ok) {
      errors.push(quotesRes.error ?? "Nie udało się wczytać cytatów.");
      setQuotes([]);
    } else {
      setQuotes(quotesRes.quotes);
    }

    if (errors.length) {
      setError(errors.join(" "));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/logowanie?next=/pracownia");
      return;
    }
    void load();
  }, [authLoading, isAuthenticated, load, router]);

  const publicLink = useMemo(() => {
    if (!displayName?.trim()) return null;
    return `/publiczna/${encodeURIComponent(displayName.trim())}`;
  }, [displayName]);

  async function handleSaveNote(payload) {
    setSaving(true);
    setError("");

    const result = editingNote
      ? await updateNote({ id: editingNote.id, ...payload })
      : await createNote(payload);

    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Nie udało się zapisać notatki.");
      return;
    }

    setNoteMode(null);
    setEditingNote(null);
    await load();
  }

  async function handleSaveQuote(payload) {
    setSaving(true);
    setError("");

    const result = editingQuote
      ? await updateUserQuote({ id: editingQuote.id, ...payload })
      : await createUserQuote(payload);

    setSaving(false);

    if (!result.ok) {
      setError(result.error ?? "Nie udało się zapisać cytatu.");
      return;
    }

    setQuoteMode(null);
    setEditingQuote(null);
    await load();
  }

  async function handleDeleteNote(note) {
    if (!window.confirm("Usunąć tę myśl?")) return;
    const result = await deleteNote(note.id);
    if (!result.ok) {
      setError(result.error ?? "Nie udało się usunąć notatki.");
      return;
    }
    await load();
  }

  async function handleDeleteQuote(quote) {
    if (!window.confirm("Usunąć ten cytat?")) return;
    const result = await deleteUserQuote(quote.id);
    if (!result.ok) {
      setError(result.error ?? "Nie udało się usunąć cytatu.");
      return;
    }
    await load();
  }

  async function openEditNote(note) {
    let shareTargets = shareMap[note.id] ?? [];
    if (note.visibility === "shared" && !shareTargets.length) {
      const res = await fetchNoteShareNicks(note.id);
      if (res.ok) {
        shareTargets = res.shares.map((s) => ({
          user_id: s.target_user_id,
          nick: s.nick,
        }));
      }
    } else {
      shareTargets = shareTargets.map((s) => ({
        user_id: s.target_user_id,
        nick: s.nick,
      }));
    }
    setEditingNote({ ...note, shareTargets });
    setNoteMode("edit");
  }

  if (authLoading || loading) {
    return (
      <JourneyShell wide>
        <JourneyCard dark>
          <p className="font-sans text-sm italic text-mistsoft">Otwieram Pracownię…</p>
        </JourneyCard>
      </JourneyShell>
    );
  }

  return (
    <JourneyShell wide>
      <JourneyCard dark className="pracownia">
        <header className="pracownia__head">
          <p className="pracownia__kick">Pracownia</p>
          <h1 className="pracownia__title">Własna twórczość</h1>
          <p className="pracownia__lead">
            Myśli i cytaty niezależne od korpusu Wyroczni — twoje słowa, twoja
            decyzja o widoczności.
          </p>
          {publicLink ? (
            <p className="pracownia__public-link">
              <Link href={publicLink}>Publiczna konstelacja · {displayName}</Link>
            </p>
          ) : (
            <p className="pracownia-form__hint">
              Ustaw nick w{" "}
              <Link href="/moje-zapisy" className="pracownia-link">
                Moje zapisy
              </Link>
              , aby mieć publiczną konstelację.
            </p>
          )}
        </header>

        <div className="pracownia-tabs" role="tablist" aria-label="Sekcje Pracowni">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "active" : undefined}
              onClick={() => {
                setTab(item.id);
                setNoteMode(null);
                setQuoteMode(null);
                setEditingNote(null);
                setEditingQuote(null);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error ? <p className="pracownia__error">{error}</p> : null}

        {tab === "mysli" ? (
          <section className="pracownia-section">
            {noteMode === "create" || (noteMode === "edit" && editingNote) ? (
              <NoteEditor
                initial={editingNote ?? undefined}
                saving={saving}
                onCancel={() => {
                  setNoteMode(null);
                  setEditingNote(null);
                }}
                onSave={handleSaveNote}
              />
            ) : (
              <div className="pracownia-section__actions">
                <BrassButton
                  className="mt-0 w-auto px-5"
                  onClick={() => setNoteMode("create")}
                >
                  napisz własną myśl
                </BrassButton>
              </div>
            )}

            {notes.length === 0 && !noteMode ? (
              <div className="pracownia-empty">
                <p className="pracownia-empty__title">Pusto na biurku</p>
                <p className="pracownia-empty__desc">
                  Zapisuj tu myśli niezwiązane z cytatem z Wyroczni.
                </p>
              </div>
            ) : (
              <ul className="pracownia-notes">
                {notes.map((note) =>
                  noteMode === "edit" && editingNote?.id === note.id ? null : (
                    <li key={note.id}>
                      <NoteCard
                        note={note}
                        shareNicks={shareMap[note.id]}
                        onEdit={() => openEditNote(note)}
                        onDelete={() => handleDeleteNote(note)}
                      />
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        ) : null}

        {tab === "cytaty" ? (
          <section className="pracownia-section">
            {quoteMode ? (
              <QuoteEditor
                kind={quoteMode}
                initial={editingQuote ?? undefined}
                saving={saving}
                onCancel={() => {
                  setQuoteMode(null);
                  setEditingQuote(null);
                }}
                onSave={handleSaveQuote}
              />
            ) : (
              <div className="pracownia-section__actions pracownia-section__actions--pair">
                <BrassButton
                  className="mt-0 w-auto px-5"
                  onClick={() => {
                    setEditingQuote(null);
                    setQuoteMode("found");
                  }}
                >
                  zapisz cudzy cytat
                </BrassButton>
                <button
                  type="button"
                  className="pracownia-btn-secondary"
                  onClick={() => {
                    setEditingQuote(null);
                    setQuoteMode("own");
                  }}
                >
                  napisz własny aforyzm
                </button>
              </div>
            )}

            {quotes.length === 0 && !quoteMode ? (
              <div className="pracownia-empty">
                <p className="pracownia-empty__title">Brak własnych cytatów</p>
                <p className="pracownia-empty__desc">
                  To nie jest korpus Wyroczni — zapisuj tu znalezione słowa lub
                  własne aforyzmy.
                </p>
              </div>
            ) : (
              <ul className="pracownia-quotes">
                {quotes.map((quote) =>
                  quoteMode && editingQuote?.id === quote.id ? null : (
                    <li key={quote.id}>
                      <UserQuoteCard
                        quote={quote}
                        ownerNick={displayName ?? "ty"}
                        onEdit={() => {
                          setEditingQuote(quote);
                          setQuoteMode(quote.kind);
                        }}
                        onDelete={() => handleDeleteQuote(quote)}
                      />
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        ) : null}
      </JourneyCard>
    </JourneyShell>
  );
}
