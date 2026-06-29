import { fetchPublicQuoteById, truncateText } from "@/lib/publicQuote";
import { QuoteTeaserView } from "@/components/share/QuoteTeaserView";
import { notFound } from "next/navigation";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const quote = await fetchPublicQuoteById(id);
  if (!quote) {
    return { title: "Your Soul" };
  }

  const description = truncateText(quote.text, 120);
  const title = quote.author ? `${quote.author} — Your Soul` : "Your Soul";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function QuoteTeaserPage({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const quote = await fetchPublicQuoteById(id);
  if (!quote) {
    notFound();
  }

  const refCode = typeof sp?.ref === "string" ? sp.ref : "";

  return <QuoteTeaserView quote={quote} refCode={refCode} />;
}
