"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  clearPendingInviteCode,
  claimInviteCode,
  storePendingInviteCode,
} from "@/lib/referralData";
import {
  BrassButton,
  JourneyCard,
  JourneyShell,
} from "@/components/journey/JourneyShell";

export function AuthForm({ mode = "login" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  async function applyInviteAfterAuth() {
    const code = inviteCode.trim();
    if (!code) return { ok: true };

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
        const result = await signUp(email, password);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        if (result.needsConfirmation) {
          if (inviteCode.trim()) {
            storePendingInviteCode(inviteCode);
          }
          setInfo(
            "Konto utworzone. Sprawdź e-mail — po logowaniu aktywujemy kod zaproszenia."
          );
          return;
        }

        const inviteAfterSignup = await applyInviteAfterAuth();
        if (!inviteAfterSignup.ok && inviteAfterSignup.error) {
          setInfo(`Konto gotowe. Kod: ${inviteAfterSignup.error}`);
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
            ? "Konto pozwala zapisać odcisk, konstelację i marginesy."
            : "Zaloguj się, aby zapisywać postęp w bazie."}
        </p>

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
            <input
              type="text"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
              placeholder="Kod zaproszenia (opcjonalnie)"
              autoComplete="off"
              className="w-full rounded-[10px] border border-brass/35 bg-white/10 px-3 py-2.5 font-mono text-sm tracking-widest text-[#ece6d8] placeholder:font-sans placeholder:tracking-normal placeholder:text-mistsoft/70 focus:border-brass focus:outline-none"
            />
          ) : null}
          {error ? (
            <p className="font-sans text-xs text-tension">{error}</p>
          ) : null}
          {info ? (
            <p className="font-sans text-xs text-mist">{info}</p>
          ) : null}
          <BrassButton type="submit" disabled={loading} className="mt-0">
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
