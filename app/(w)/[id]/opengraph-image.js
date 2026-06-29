import { renderQuoteCardImage } from "@/lib/og/renderQuoteCardImage";

export const runtime = "edge";
export const alt = "Karta Wyroczni — Your Soul";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }) {
  const { id } = await params;
  const image = await renderQuoteCardImage(id);
  if (!image) {
    return new Response("Not found", { status: 404 });
  }
  return image;
}
