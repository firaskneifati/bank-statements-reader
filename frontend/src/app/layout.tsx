import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bankread.ai"),
  title: {
    default: "BankRead — Bank Statement Reader",
    template: "%s | BankRead",
  },
  description:
    "Upload PDF bank statements and extract structured transactions. Export to CSV or Excel in seconds.",
  keywords: [
    "bank statement reader",
    "PDF parser",
    "transaction extractor",
    "CSV export",
    "bank statement to Excel",
  ],
  openGraph: {
    title: "BankRead — Bank Statement Reader",
    description:
      "Upload PDF bank statements and extract structured transactions. Export to CSV or Excel in seconds.",
    url: "https://bankread.ai",
    siteName: "BankRead",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BankRead — Bank Statement Reader",
    description:
      "Upload PDF bank statements and extract structured transactions. Export to CSV or Excel in seconds.",
  },
  robots: {
    index: true,
    follow: true,
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
        </SessionProvider>
      </body>
    </html>
  );
}
