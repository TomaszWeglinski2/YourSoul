"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
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
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const returnTo = searchParams.get("next") ?? "/wrota";
  const isRegister = mode === "register";

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");

    if (isRegister) {
      const result = await signUp(email, password);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      if (result.needsConfirmation) {
        setInfo(
          "Konto utworzone. Sprawdź e-mail i potwierdź rejestrację, potem się zaloguj."
        );
        setLoading(false);
        return;
      }
      router.push(returnTo);
      return;
    }

    const result = await signIn(email, password);
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(returnTo);
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
          {error ? (
            <p className="font-sans text-xs text-tension">{error}</p>
          ) : null}
          {info ? (
            <p className="font-sans text-xs text-mist">{info}</p>
          ) : null}
          <BrassButton disabled={loading} className="mt-0">
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
