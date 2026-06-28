"use client";

export function AdminShell({ children }) {
  return (
    <main className="flex flex-1 justify-center p-4">
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <header className="flex items-center justify-between px-0.5 opacity-90">
          <div className="flex items-center gap-2">
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-brass font-serif text-xs text-brass">
              ✦
            </span>
            <span className="font-serif text-[11px] uppercase tracking-[0.16em] text-mist">
              Your <b className="font-semibold text-brass">Soul</b>
            </span>
          </div>
          <span className="font-sans text-[10.5px] tracking-wide text-mistsoft">
            panel redaktora
          </span>
        </header>
        {children}
      </div>
    </main>
  );
}

export function AdminCard({ children, dark = false, className = "" }) {
  return (
    <section
      className={
        dark
          ? `rounded-[14px] bg-[radial-gradient(120%_100%_at_50%_25%,#1b2236_0%,#11151f_100%)] p-5 text-mist shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] ${className}`
          : `rounded-[14px] bg-gradient-to-b from-page to-page2 p-5 text-ink shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)] ${className}`
      }
    >
      {children}
    </section>
  );
}

export function AdminKick({ children, dark = false }) {
  return (
    <p
      className={`mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] ${
        dark ? "text-brass" : "text-brassdeep"
      }`}
    >
      {children}
    </p>
  );
}

export function AdminButton({
  children,
  disabled,
  onClick,
  type = "button",
  variant = "primary",
  className = "",
}) {
  const base =
    variant === "ghost"
      ? "border border-mist/30 bg-transparent text-mistsoft hover:border-mist/50 hover:bg-mist/10"
      : "border border-brass bg-brass text-[#fff8ec] hover:bg-brassdeep hover:-translate-y-px";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-[11px] px-4 py-3 font-sans text-sm transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${base} ${className}`}
    >
      {children}
    </button>
  );
}

export function ImportSummary({ summary }) {
  if (!summary) return null;

  return (
    <AdminCard dark>
      <AdminKick dark>Podsumowanie importu</AdminKick>
      <div className="mb-4 grid grid-cols-2 gap-3 font-sans text-sm">
        <div className="rounded-[10px] border border-brass/30 bg-brass/10 px-3 py-2">
          <p className="text-xs text-mistsoft">Dodano / zaktualizowano</p>
          <p className="font-serif text-2xl text-[#ece6d8]">{summary.added}</p>
        </div>
        <div className="rounded-[10px] border border-brass/30 bg-brass/10 px-3 py-2">
          <p className="text-xs text-mistsoft">Pominięto</p>
          <p className="font-serif text-2xl text-[#ece6d8]">
            {summary.skipped?.length ?? 0}
          </p>
        </div>
      </div>

      {summary.warnings?.length > 0 ? (
        <div className="mb-4">
          <p className="mb-2 font-sans text-xs uppercase tracking-wide text-brass">
            Ostrzeżenia
          </p>
          <ul className="space-y-1 font-sans text-xs text-[#ece6d8]">
            {summary.warnings.map((item, index) => (
              <li key={`warn-${item.row ?? index}`}>
                Wiersz {item.row}: {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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
    </AdminCard>
  );
}
