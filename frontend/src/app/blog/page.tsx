import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Bank Statement Parsing Guides | PDF, Scanned & Photos",
  description:
    "Learn how to convert PDF bank statements, scanned documents, and photos from TD, RBC, BMO, Scotiabank, CIBC, Chase, Bank of America, and Wells Fargo to CSV or Excel.",
  alternates: { canonical: "https://bankread.ai/blog" },
  openGraph: {
    title: "BankRead Blog — Bank Statement Parsing Guides | PDF, Scanned & Photos",
    description:
      "Step-by-step guides for converting bank statement PDFs, scanned documents, and photos to CSV and Excel. Covers TD, RBC, BMO, Scotiabank, CIBC, Chase, Bank of America, and Wells Fargo.",
    url: "https://bankread.ai/blog",
    siteName: "BankRead",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BankRead Blog — Bank Statement Parsing Guides | PDF, Scanned & Photos",
    description:
      "Step-by-step guides for converting bank statement PDFs, scanned documents, and photos to CSV and Excel.",
  },
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
              <rect x="4" y="2" width="24" height="28" rx="3" fill="#2563eb"/>
              <rect x="7" y="5" width="18" height="22" rx="1.5" fill="#fff"/>
              <text x="16" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#2563eb">$</text>
              <rect x="9" y="7" width="14" height="2" rx="1" fill="#93c5fd"/>
            </svg>
            <span className="text-xl font-bold text-gray-900">BankRead</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
          Blog
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          Guides for converting bank statement PDFs, scanned documents, and photos to CSV and Excel.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {blogPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block bg-gray-50 rounded-2xl p-6 hover:shadow-md transition-shadow border border-gray-100"
            >
              <p className="text-sm text-gray-500 mb-2">
                {new Date(post.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}{" "}
                &middot; {post.readingTime}
              </p>
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                {post.title}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {post.description}
              </p>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#2563eb"/>
                <rect x="7" y="5" width="18" height="22" rx="1.5" fill="#fff"/>
                <text x="16" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#2563eb">$</text>
                <rect x="9" y="7" width="14" height="2" rx="1" fill="#93c5fd"/>
              </svg>
              <span className="text-white font-semibold">BankRead</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} BankRead. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
