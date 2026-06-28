"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  applyPendingDisplayNameIfAny,
  setDisplayName,
  storePendingDisplayName,
} from "@/lib/userData";
import {
  clearPendingInviteCode,
  claimInviteCode,
  storePendingInviteCode,
  validateInviteCode,
} from "@/lib/referralData";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";

export function AuthForm({ mode = "login" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, signOut, refreshDisplayName } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayNameInput] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const returnTo = searchParams.get("next") ?? "/wrota";
  const inviteFromUrl = searchParams.get("invite") ?? "";
  const isRegister = mode === "register";

  useEffect(() => {
    if (inviteFromUrl) {
      setInviteCode(inviteFromUrl.toUpperCase());
      storePendingInviteCode(inviteFromUrl);
    }
  }, [inviteFromUrl]);

  async function applyInviteAfterAuth({ required = false } = {}) {
    const code = inviteCode.trim();
    if (!code) {
      if (required) {
        return { ok: false, error: "Kod zaproszenia jest wymagany." };
      }
      return { ok: true };
    }

    const result = await claimInviteCode(code);
    if (result.ok) {
      clearPendingInviteCode();
      return result;
    }

    storePendingInviteCode(code);
    return result;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    try {
      if (isRegister) {
        const code = inviteCode.trim();
        const name = displayName.trim();
        if (!name || name.length < 3) {
          setError("Podaj nazwę podróżnika (min. 3 znaki).");
          return;
        }
        if (!code) {
          setError("Your Soul jest dostępne tylko na zaproszenie — podaj kod.");
          return;
        }

        const validation = await validateInviteCode(code);
        if (!validation.ok) {
          setError(validation.error ?? "Nie udało się sprawdzić kodu.");
          return;
        }
        if (!validation.valid) {
          setError(validation.error ?? "Kod niedostępny lub już wykorzystany.");
          return;
        }

        storePendingInviteCode(code);
        storePendingDisplayName(name);

        const result = await signUp(email, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.needsConfirmation) {
          setInfo(
            "Konto utworzone. Potwierdź e-mail, zaloguj się z tym samym kodem i nazwą — bez nich droga pozostaje zamknięta."
          );
          return;
        }

        const nameResult = await setDisplayName(name);
        if (!nameResult.ok) {
          await signOut();
          setError(nameResult.error ?? "Nie udało się zapisać nazwy.");
          return;
        }
        await refreshDisplayName(result.user?.id);

        const inviteAfterSignup = await applyInviteAfterAuth({ required: true });
        if (!inviteAfterSignup.ok) {
          await signOut();
          setError(
            inviteAfterSignup.error ??
              "Nie udało się aktywować kodu. Spróbuj ponownie z ważnym zaproszeniem."
          );
          return;
        }

        router.push(returnTo);
        return;
      }

      const result = await signIn(email, password);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      await applyInviteAfterAuth();

      router.push(returnTo);
    } catch {
      setError("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <JourneyShell>
      <JourneyCard dark>
        <p className="mb-3 font-sans text-[10.5px] uppercase tracking-[0.16em] text-brass">
          {isRegister ? "Rejestracja" : "Logowanie"}
        </p>
        <h1 className="mb-2.5 font-serif text-[25px] font-medium leading-tight text-[#ece6d8]">
          {isRegister ? "Dołącz do drogi" : "Wróć do drogi"}
        </h1>
        <p className="mb-5 font-sans text-sm leading-relaxed text-mist">
          {isRegister
            ? "Serwis jest dostępny wyłącznie na zaproszenie kogoś z tej społeczności. Kod otrzymujesz od osoby, która już przeszła Wrota."
            : "Zaloguj się, aby zapisywać postęp w bazie."}
        </p>

        {isRegister ? (
          <p className="mb-4 rounded-[10px] border border-brass/25 bg-brass/10 px-3 py-2.5 font-sans text-xs leading-relaxed text-mist">
            Bez ważnego kodu zaproszenia nie można utworzyć konta. Kod wiąże się z
            Tobą dopiero po przejściu Wrót — do tego czasu czeka w oczekiwaniu.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="E-mail"
            autoComplete="email"
            className="w-full rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2.5 font-sans text-sm text-[#ece6d8] placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Hasło (min. 6 znaków)"
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="w-full rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2.5 font-sans text-sm text-[#ece6d8] placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
          />
          {isRegister ? (
            <>
              <label className="font-sans text-[11px] uppercase tracking-[0.12em] text-brass">
                Nazwa podróżnika
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={24}
                value={displayName}
                onChange={(event) => setDisplayNameInput(event.target.value)}
                placeholder="np. Zmierzch"
                autoComplete="username"
                className="w-full rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2.5 font-sans text-sm text-[#ece6d8] placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
              />
              <label className="font-sans text-[11px] uppercase tracking-[0.12em] text-brass">
                Kod zaproszenia
              </label>
              <input
                type="text"
                required
                minLength={4}
                value={inviteCode}
                onChange={(event) =>
                  setInviteCode(event.target.value.toUpperCase())
                }
                placeholder="np. AB12CD34"
                autoComplete="off"
                className="w-full rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2.5 font-mono text-sm tracking-widest text-[#ece6d8] placeholder:font-sans placeholder:tracking-normal placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
              />
            </>
          ) : null}
          {error ? (
            <p className="font-sans text-xs text-tension">{error}</p>
          ) : null}
          {info ? (
            <p className="font-sans text-xs text-mist">{info}</p>
          ) : null}
          <BrassButton
            type="submit"
            disabled={
              loading ||
              (isRegister && (!inviteCode.trim() || displayName.trim().length < 3))
            }
            className="mt-0"
          >
            {loading
              ? "Chwila…"
              : isRegister
                ? "Utwórz konto"
                : "Zaloguj się"}
          </BrassButton>
        </form>

        <p className="mt-4 text-center font-sans text-xs text-mistsoft">
          {isRegister ? (
            <>
              Masz konto?{" "}
              <Link href={`/logowanie?next=${encodeURIComponent(returnTo)}`} className="text-brass hover:underline">
                Zaloguj się
              </Link>
            </>
          ) : (
            <>
              Pierwszy raz?{" "}
              <Link href={`/rejestracja?next=${encodeURIComponent(returnTo)}`} className="text-brass hover:underline">
                Zarejestruj się
              </Link>
            </>
          )}
        </p>
      </JourneyCard>
    </JourneyShell>
  );
}
