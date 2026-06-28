"use client";

import { useState } from "react";

const EXPECTED_COLUMNS =
  "text, author, work, year, rights, dom, sens, zachwyt, wspolnota, tajemnica, prowokacja, glosa";

export default function AdminImportPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [file, setFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [summary, setSummary] = useState(null);

  async function handleUnlock(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setAuthenticated(false);
        setAuthError(data.error ?? "Nieprawidłowe hasło.");
        return;
      }

      setAuthenticated(true);
    } catch {
      setAuthError("Nie udało się zweryfikować hasła.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleImport(event) {
    event.preventDefault();
    if (!file) {
      setImportError("Wybierz plik .xlsx.");
      return;
    }

    setImportLoading(true);
    setImportError("");
    setSummary(null);

    const formData = new FormData();
    formData.append("password", password);
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setImportError(data.error ?? "Import nie powiódł się.");
        return;
      }

      setSummary(data);
    } catch {
      setImportError("Nie udało się wysłać pliku.");
    } finally {
      setImportLoading(false);
    }
  }

  return (
    <main className="flex flex-1 justify-center p-4">
      <div className="w-full max-w-md flex flex-col gap-4">
        <header className="flex items-center justify-between opacity-90 px-0.5">
          <div className="flex items-center gap-2">
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-brass font-serif text-xs text-brass">
              ✦
            </span>
            <span className="font-serif text-[11px] uppercase tracking-[0.16em]">
              Your <b className="font-semibold text-brass">Soul</b>
            </span>
          </div>
          <span className="font-sans text-[10.5px] tracking-wide text-mistsoft">
            admin
          </span>
        </header>

        {!authenticated ? (
          <section className="rounded-[14px] bg-gradient-to-b from-page to-page2 p-5 text-ink shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)]">
            <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brassdeep">
              Import cytatów
            </p>
            <h1 className="mb-2 font-serif text-[25px] font-medium leading-tight text-ink">
              Dostęp administracyjny
            </h1>
            <p className="mb-5 font-sans text-sm leading-relaxed text-inksoft">
              Wprowadź hasło, aby przejść do importu pliku Excel.
            </p>

            <form onSubmit={handleUnlock} className="flex flex-col gap-3">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Hasło administratora"
                autoComplete="current-password"
                className="w-full rounded-[10px] border border-brass/35 bg-white/40 px-3 py-2.5 font-sans text-sm text-ink placeholder:text-inksoft/70 focus:border-brass focus:outline-none"
              />
              {authError ? (
                <p className="font-sans text-xs text-tension">{authError}</p>
              ) : null}
              <button
                type="submit"
                disabled={authLoading || !password}
                className="w-full rounded-[11px] border border-brass bg-brass px-4 py-3.5 font-sans text-sm text-[#fff8ec] transition-all duration-150 hover:bg-brassdeep hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
              >
                {authLoading ? "Sprawdzam…" : "Wejdź"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <section className="rounded-[14px] bg-gradient-to-b from-page to-page2 p-5 text-ink shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)]">
              <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brassdeep">
                Import cytatów
              </p>
              <h1 className="mb-2 font-serif text-[25px] font-medium leading-tight text-ink">
                Wgraj plik Excel
              </h1>
              <p className="mb-4 font-sans text-sm leading-relaxed text-inksoft">
                Oczekiwane kolumny w pierwszym wierszu:
              </p>
              <p className="mb-5 rounded-lg border border-brass/25 bg-brass/10 px-3 py-2 font-sans text-xs leading-relaxed text-inksoft">
                {EXPECTED_COLUMNS}
              </p>

              <form onSubmit={handleImport} className="flex flex-col gap-3">
                <label className="block">
                  <span className="sr-only">Plik .xlsx</span>
                  <input
                    type="file"
                    accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                    className="block w-full font-sans text-sm text-ink file:mr-3 file:rounded-lg file:border file:border-brass/45 file:bg-brass/10 file:px-3 file:py-2 file:text-sm file:text-ink hover:file:border-brass"
                  />
                </label>

                {importError ? (
                  <p className="font-sans text-xs text-tension">{importError}</p>
                ) : null}

                <button
                  type="submit"
                  disabled={importLoading || !file}
                  className="w-full rounded-[11px] border border-brass bg-brass px-4 py-3.5 font-sans text-sm text-[#fff8ec] transition-all duration-150 hover:bg-brassdeep hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importLoading ? "Importuję…" : "Importuj"}
                </button>
              </form>
            </section>

            {summary ? (
              <section className="rounded-[14px] bg-[radial-gradient(120%_100%_at_50%_25%,#1b2236_0%,#11151f_100%)] p-5 text-mist shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]">
                <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
                  Podsumowanie
                </p>

                <div className="mb-4 grid grid-cols-2 gap-3 font-sans text-sm">
                  <div className="rounded-[10px] border border-brass/30 bg-brass/10 px-3 py-2">
                    <p className="text-mistsoft text-xs">Dodano</p>
                    <p className="font-serif text-2xl text-[#ece6d8]">{summary.added}</p>
                  </div>
                  <div className="rounded-[10px] border border-brass/30 bg-brass/10 px-3 py-2">
                    <p className="text-mistsoft text-xs">Pominięto</p>
                    <p className="font-serif text-2xl text-[#ece6d8]">
                      {summary.skipped?.length ?? 0}
                    </p>
                  </div>
                </div>

                {summary.skipped?.length > 0 ? (
                  <div className="mb-4">
                    <p className="mb-2 font-sans text-xs uppercase tracking-wide text-mistsoft">
                      Pominięte wiersze
                    </p>
                    <ul className="space-y-1 font-sans text-xs text-mist">
                      {summary.skipped.map((item) => (
                        <li key={`skip-${item.row}`}>
                          Wiersz {item.row}: {item.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {summary.errors?.length > 0 ? (
                  <div>
                    <p className="mb-2 font-sans text-xs uppercase tracking-wide text-tension">
                      Błędy
                    </p>
                    <ul className="space-y-1 font-sans text-xs text-[#cdd3ea]">
                      {summary.errors.map((item, index) => (
                        <li key={`err-${item.row ?? index}-${index}`}>
                          {item.row ? `Wiersz ${item.row}: ` : ""}
                          {item.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="font-sans text-sm italic text-mistsoft">
                    Brak błędów — import zakończony pomyślnie.
                  </p>
                )}
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
