import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bank Statement Reader",
  description: "Parse bank statements into structured transactions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-xl font-bold text-gray-900">
              Bank Statement Reader
            </h1>
            <p className="text-sm text-gray-500">
              Upload PDF statements to extract and export transactions
            </p>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
