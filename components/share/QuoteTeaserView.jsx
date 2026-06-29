"use client";

import { useEffect } from "react";
import Link from "next/link";
import { storePendingInviteCode } from "@/lib/referralData";
import { teaserExcerpt } from "@/lib/publicQuote";

export function QuoteTeaserView({ quote, refCode }) {
  useEffect(() => {
    const code = refCode?.trim();
    if (code) {
      storePendingInviteCode(code);
    }
  }, [refCode]);

  const excerpt = teaserExcerpt(quote.text);
  const authorLine = quote.work
    ? `${quote.author}, ${quote.work}`
    : quote.author;

  return (
    <main className="quote-teaser">
      <div className="quote-teaser__glow" aria-hidden />
      <article className="quote-teaser__card">
        <header className="quote-teaser__brand">
          <span className="quote-teaser__mark" aria-hidden>
            ✦
          </span>
          <span className="quote-teaser__logo">
            Your <em>Soul</em>
          </span>
        </header>

        <blockquote className="quote-teaser__quote">
          <p>„{quote.text}"</p>
          {authorLine ? (
            <footer className="quote-teaser__author">— {authorLine}</footer>
          ) : null}
        </blockquote>

        <section className="quote-teaser__hook" aria-label="Zajawka">
          <p className="quote-teaser__hook-label">Zajawka</p>
          <p className="quote-teaser__hook-text">
            {quote.glosa ?? excerpt}
          </p>
        </section>

        <div className="quote-teaser__cta">
          <Link href="/" className="quote-teaser__btn quote-teaser__btn--primary">
            Wejdź do Wyroczni
          </Link>
          {refCode?.trim() ? (
            <p className="quote-teaser__ref">
              Zaproszenie: <code>{refCode.trim().toUpperCase()}</code>
            </p>
          ) : null}
        </div>
      </article>
    </main>
  );
}
