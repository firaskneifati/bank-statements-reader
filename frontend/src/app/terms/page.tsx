import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "BankRead Terms of Service — rules and conditions for using our platform.",
  alternates: { canonical: "https://bankread.ai/terms" },
};

export default function TermsOfServicePage() {
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
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: February 11, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using BankRead (&quot;the Service&quot;), operated by BankRead (&quot;we&quot;, &quot;us&quot;,
              or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms,
              do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              BankRead is an AI-powered platform that extracts transaction data from PDF bank statements and exports
              it to CSV or Excel format. The Service includes document processing, AI-based transaction categorization,
              multi-statement uploads, and data export capabilities.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Registration</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your password and for all activities under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>You must be at least 16 years of age to create an account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Subscription Plans and Billing</h2>
            <p className="mb-3">
              BankRead offers the following subscription tiers, billed monthly in Canadian Dollars (CAD):
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Free</strong> — 10 pages/month at no cost</li>
              <li><strong>Basic</strong> — 100 pages/month for CA$15/mo</li>
              <li><strong>Starter</strong> — 400 pages/month for CA$49/mo</li>
              <li><strong>Pro</strong> — 2,000 pages/month for CA$199/mo</li>
              <li><strong>Business</strong> — custom volume, contact us for pricing</li>
            </ul>
            <p className="mt-3">
              Paid subscriptions are processed by <strong>Stripe</strong> and renew automatically each billing cycle.
              You may cancel at any time; access continues until the end of the current billing period.
              Unused pages do not roll over. We reserve the right to change pricing with 30 days&apos; notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Upload documents you do not have the right to process</li>
              <li>Attempt to reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Interfere with or disrupt the Service or its infrastructure</li>
              <li>Use automated tools to scrape, crawl, or extract data from the Service beyond normal use</li>
              <li>Resell, sublicense, or redistribute the Service without written permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
            <p>
              The BankRead platform, including its design, code, AI models, and branding, is owned by BankRead
              and protected by applicable intellectual property laws. You retain full ownership of your uploaded
              documents and extracted data. We claim no rights over your content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>, which
              describes how we collect, use, and protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Accuracy of Results and Human Review</h2>
            <p className="mb-3">
              BankRead uses AI and optical character recognition (OCR) to extract transaction data from your documents.
              <strong> We are not liable or responsible for the accuracy, completeness, or correctness of the extracted data.</strong> AI-generated
              results may contain errors, including but not limited to incorrect amounts, dates, descriptions, or categorizations.
            </p>
            <p className="mb-3">
              <strong>You acknowledge and agree that:</strong>
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>All extracted data should be treated as a draft that requires human verification.</li>
              <li>You are solely responsible for reviewing and verifying all results before relying on them for any purpose, including but not limited to accounting, tax filing, financial reporting, or legal compliance.</li>
              <li>Scanned PDFs and images may produce less accurate results than text-based PDFs and require additional human review.</li>
              <li>BankRead is not a substitute for professional accounting, bookkeeping, or financial advice.</li>
              <li>We are not liable for any decisions made or actions taken based on the output of this Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Disclaimer of Warranties</h2>
            <p>
              The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either
              express or implied, including but not limited to implied warranties of merchantability, fitness for a
              particular purpose, and non-infringement. We do not warrant that the Service will be uninterrupted,
              error-free, or completely secure. We make no guarantees regarding the accuracy of AI-generated data extraction
              or categorization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, BankRead and its officers, employees, and affiliates
              shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any
              loss of profits, data, or goodwill, arising out of or in connection with your use of the Service,
              including any damages arising from inaccurate or incomplete data extraction.
              Our total aggregate liability shall not exceed the amount you paid us in the twelve (12) months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Termination</h2>
            <p>
              We may suspend or terminate your account at any time if you violate these Terms or engage in activity
              that harms the Service or other users. You may delete your account at any time by contacting us.
              Upon termination, your right to use the Service ceases immediately. Sections that by their nature
              should survive termination (e.g., limitation of liability, governing law) will remain in effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of the Province of Ontario,
              Canada, without regard to its conflict of law principles. Any disputes arising under these Terms
              shall be subject to the exclusive jurisdiction of the courts of Ontario, Canada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. We will notify you of material changes by posting the
              revised Terms on this page and updating the &quot;Last updated&quot; date. Your continued use of the
              Service after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact Us</h2>
            <p>
              If you have questions about these Terms, contact us at:
            </p>
            <p className="mt-2">
              <a href="mailto:support@bankread.ai" className="text-blue-600 hover:underline">support@bankread.ai</a>
            </p>
          </section>
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
