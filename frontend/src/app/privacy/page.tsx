import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "BankRead Privacy Policy — how we collect, use, and protect your data.",
  alternates: { canonical: "https://bankread.ai/privacy" },
};

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: February 11, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>
              BankRead (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the website{" "}
              <Link href="https://bankread.ai" className="text-blue-600 hover:underline">bankread.ai</Link> and
              the BankRead application (collectively, the &quot;Service&quot;). This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">Account Information</h3>
            <p>
              When you create an account, we collect your full name, email address, and an encrypted
              password. You may optionally provide an organization name.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">Uploaded Documents</h3>
            <p>
              When you upload PDF bank statements, the documents are processed in memory to extract
              transaction data. <strong>We do not store your uploaded PDFs or the raw file contents on our servers.</strong>{" "}
              Once processing is complete, the file data is discarded.
            </p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">Usage Data</h3>
            <p>
              We collect information about how you interact with the Service, including pages processed,
              features used, timestamps, and general usage statistics for billing and service improvement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide and maintain the Service, including processing your bank statement PDFs</li>
              <li>To manage your account, subscriptions, and billing</li>
              <li>To communicate with you about your account, support requests, or service updates</li>
              <li>To enforce our Terms of Service and protect against misuse</li>
              <li>To improve and develop new features for the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services to operate BankRead:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Stripe</strong> — Payment processing and subscription billing. Stripe processes your payment card details directly; we do not store card numbers. See <a href="https://stripe.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Stripe&apos;s Privacy Policy</a>.</li>
              <li><strong>Anthropic (Claude API)</strong> — AI-powered transaction extraction and categorization. Document content is sent to Anthropic for processing. See <a href="https://www.anthropic.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Anthropic&apos;s Privacy Policy</a>.</li>
              <li><strong>Resend</strong> — Transactional email delivery (password resets, notifications).</li>
              <li><strong>Vercel</strong> — Frontend hosting and deployment.</li>
              <li><strong>Cloudflare</strong> — DNS, CDN, and DDoS protection.</li>
              <li><strong>Hetzner</strong> — Backend server hosting (located in data centers with ISO 27001 certification).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies and Local Storage</h2>
            <p className="mb-3">BankRead uses the following cookies and browser storage:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Session cookie</strong> (essential) — A secure, HTTP-only JWT cookie set by NextAuth.js to maintain your authenticated session.</li>
              <li><strong>CSRF token cookie</strong> (essential) — Protects against cross-site request forgery attacks.</li>
              <li><strong>cookie-consent</strong> (localStorage) — Stores your cookie consent preference (&quot;all&quot; or &quot;necessary&quot;).</li>
            </ul>
            <p className="mt-3">
              We do not use third-party tracking cookies, analytics cookies, or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Retention and Deletion</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Uploaded PDFs:</strong> Processed in memory and immediately discarded. Never written to disk.</li>
              <li><strong>Account data:</strong> Retained while your account is active. You may request deletion at any time.</li>
              <li><strong>Usage logs:</strong> Retained for up to 12 months for billing and service improvement, then deleted.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p className="mb-3">Depending on your jurisdiction, you may have the following rights:</p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">GDPR (European Economic Area)</h3>
            <p>Right to access, rectify, erase, restrict processing, data portability, and object to processing of your personal data.</p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">PIPEDA (Canada)</h3>
            <p>Right to access your personal information, request corrections, and withdraw consent for non-essential processing.</p>

            <h3 className="text-base font-semibold text-gray-900 mt-4 mb-2">CCPA (California, USA)</h3>
            <p>Right to know what personal information is collected, request deletion, and opt out of the sale of personal information. We do not sell your personal information.</p>

            <p className="mt-4">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@bankread.ai" className="text-blue-600 hover:underline">privacy@bankread.ai</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information,
              including encrypted connections (TLS), hashed passwords, optional two-factor authentication (TOTP),
              and access controls. However, no method of electronic storage or transmission is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
            <p>
              The Service is not directed at individuals under the age of 16. We do not knowingly collect
              personal information from children. If we learn that we have collected data from a child under 16,
              we will delete it promptly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by
              posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use
              of the Service after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or wish to exercise your data rights, contact us at:
            </p>
            <p className="mt-2">
              <a href="mailto:privacy@bankread.ai" className="text-blue-600 hover:underline">privacy@bankread.ai</a>
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
