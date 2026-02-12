import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { CookieBanner } from "@/components/CookieBanner";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bankread.ai"),
  title: {
    default: "BankRead — AI Bank Statement Reader | PDF, Scanned & Photo to CSV & Excel",
    template: "%s | BankRead",
  },
  description:
    "Upload PDF bank statements, scanned documents, or photos and automatically extract transactions with AI. Export to CSV or Excel in seconds. Supports TD, RBC, BMO, Scotiabank, CIBC, Chase, and more.",
  keywords: [
    "bank statement reader",
    "bank statement parser",
    "PDF to CSV",
    "PDF to Excel",
    "scanned bank statement",
    "photo bank statement",
    "image to CSV",
    "transaction extractor",
    "bank statement converter",
    "AI categorization",
    "financial data extraction",
    "mobile camera capture",
  ],
  alternates: {
    canonical: "https://bankread.ai",
  },
  openGraph: {
    title: "BankRead — AI Bank Statement Reader | PDF, Scanned & Photo to CSV & Excel",
    description:
      "Upload PDF bank statements, scanned documents, or photos and extract transactions with AI. Export to CSV or Excel in seconds.",
    url: "https://bankread.ai",
    siteName: "BankRead",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BankRead — AI Bank Statement Reader | PDF, Scanned & Photo to CSV & Excel",
    description:
      "Upload PDF bank statements, scanned documents, or photos and extract transactions with AI. Export to CSV or Excel in seconds.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <SessionProvider session={session}>
          {children}
          <CookieBanner />
          <GoogleAnalytics />
        </SessionProvider>
      </body>
    </html>
  );
}
