"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useJourney } from "@/context/JourneyContext";

export function JourneyShell({ children }) {
  const router = useRouter();
  const { resetJourney } = useJourney();
  const { user, signOut, loading } = useAuth();

  function handleReset() {
    resetJourney();
    router.push("/");
  }

  return (
    <main className="flex flex-1 justify-center p-3.5">
      <div className="flex w-full max-w-[440px] flex-col">
        <div className="mb-3.5 flex items-center justify-between px-0.5 opacity-[0.92]">
          <div className="flex items-center gap-2">
            <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-brass font-serif text-xs text-brass">
              ✦
            </span>
            <span className="font-serif text-[11px] uppercase tracking-[0.16em]">
              Your <b className="font-semibold text-brass">Soul</b>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {!loading && (
              user ? (
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="cursor-pointer border-none bg-transparent font-sans text-[10.5px] tracking-[0.05em] text-mistsoft hover:text-brass"
                >
                  wyloguj
                </button>
              ) : (
                <Link
                  href="/logowanie"
                  className="font-sans text-[10.5px] tracking-[0.05em] text-mistsoft hover:text-brass"
                >
                  zaloguj
                </Link>
              )
            )}
            <button
              type="button"
              onClick={handleReset}
              className="cursor-pointer border-none bg-transparent font-sans text-[10.5px] tracking-[0.05em] text-mistsoft hover:text-brass"
            >
              zacznij od nowa
            </button>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}

export function JourneyCard({ children, dark = false, className = "" }) {
  return (
    <div
      className={`${
        dark
          ? "rounded-[14px] bg-[radial-gradient(120%_100%_at_50%_25%,#1b2236_0%,#11151f_100%)] p-5 text-mist shadow-[inset_0_0_60px_rgba(0,0,0,0.5)] animate-[fadeIn_0.4s_ease_both]"
          : "rounded-[14px] bg-gradient-to-b from-page to-page2 p-5 text-ink shadow-[0_16px_40px_-20px_rgba(0,0,0,0.6)] animate-[fadeIn_0.4s_ease_both]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function BrassButton({ children, disabled, onClick, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`mt-2.5 block w-full rounded-[11px] border border-brass bg-brass px-4 py-3.5 text-center font-sans text-sm text-[#fff8ec] transition-all duration-150 hover:bg-brassdeep hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
