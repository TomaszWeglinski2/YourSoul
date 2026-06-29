import { ImageResponse } from "@vercel/og";
import { fetchPublicQuoteById, truncateText } from "@/lib/publicQuote";
import { loadOgFonts } from "@/lib/og/loadFonts";

export async function renderQuoteCardImage(quoteId) {
  const quote = await fetchPublicQuoteById(quoteId);
  if (!quote) {
    return null;
  }

  const fonts = await loadOgFonts();
  const quoteText =
    quote.text.length > 220 ? `${quote.text.slice(0, 217).trim()}…` : quote.text;
  const teaser = quote.glosa
    ? truncateText(quote.glosa, 100)
    : truncateText(quote.text, 100);
  const authorLine = quote.work
    ? `${quote.author}, ${quote.work}`
    : quote.author;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(130% 90% at 50% 0%, #20283f 0%, #141826 55%, #0d1017 100%)",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 920,
            padding: "52px 56px",
            borderRadius: 20,
            background: "linear-gradient(180deg, #f1e9da 0%, #e6dac4 100%)",
            boxShadow: "0 24px 64px rgba(0,0,0,0.45)",
            border: "1px solid rgba(196,153,90,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "1px solid #c4995a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#c4995a",
                fontFamily: "Spectral",
                fontSize: 18,
              }}
            >
              ✦
            </div>
            <span
              style={{
                fontFamily: "Spectral",
                fontSize: 14,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#6a6051",
              }}
            >
              Your <span style={{ color: "#c4995a", fontWeight: 600 }}>Soul</span>
            </span>
          </div>

          <p
            style={{
              fontFamily: "Spectral",
              fontStyle: "italic",
              fontSize: 42,
              lineHeight: 1.35,
              color: "#2b2620",
              margin: 0,
            }}
          >
            „{quoteText}"
          </p>

          <p
            style={{
              marginTop: 22,
              fontSize: 18,
              color: "#9a7236",
              fontFamily: "Inter",
            }}
          >
            — {authorLine}
          </p>

          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid rgba(154,114,54,0.25)",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#9a7236",
              }}
            >
              Zajawka
            </span>
            <p
              style={{
                fontSize: 16,
                lineHeight: 1.45,
                color: "#6a6051",
                margin: 0,
                fontFamily: "Spectral",
                fontStyle: "italic",
              }}
            >
              {teaser}
            </p>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
    }
  );
}
