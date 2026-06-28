import { Spectral, Inter } from "next/font/google";
import "./globals.css";

const spectral = Spectral({
  variable: "--font-spectral",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
});

const inter = Inter({
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  subsets: ["latin", "latin-ext"],
});

export const metadata = {
  title: "Your Soul",
  description: "Your Soul — solowa ścieżka.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pl"
      className={`${spectral.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
