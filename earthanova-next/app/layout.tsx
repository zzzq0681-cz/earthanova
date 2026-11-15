import type { Metadata } from "next";
import "./globals.css";

const title = "Earthanova — Explore Earth. Understand change.";
const description =
  "Earthanova: be a data detective: pick any place on Earth, explore NASA climate variables, and test whether their trends are real.";

export const metadata: Metadata = {
  title,
  description,
  // The original Figma Make site was configured as not indexable.
  robots: { index: false, follow: false },
  openGraph: { title, description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Loaded as plain Google Fonts so the literal "Bricolage Grotesque"/"Inter" family names used
            in CSS and in JS-generated SVG keep working. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      {/* lib/earthanova.js switches these data-* attributes at runtime. */}
      <body data-page="splash" data-state="idle" data-view="basic" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
