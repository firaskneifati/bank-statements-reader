"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === "true";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [referralSource, setReferralSource] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data: Record<string, string> = {};
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");
    if (utmSource) data.utm_source = utmSource;
    if (utmMedium) data.utm_medium = utmMedium;
    if (utmCampaign) data.utm_campaign = utmCampaign;
    if (document.referrer) data.referrer = document.referrer;
    if (Object.keys(data).length > 0) {
      setReferralSource(JSON.stringify(data));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          organization_name: orgName || undefined,
          referral_source: referralSource || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ detail: "Registration failed" }));
        setError(data.detail || "Registration failed");
        setLoading(false);
        return;
      }

      // Fire Google Ads sign-up conversion
      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: "AW-751839701/EcW4CNTNpfcbENXTwOYC",
        });
      }

      // Auto sign-in after registration — let NextAuth handle redirect
      const callbackUrl = planParam && planParam !== "free"
        ? `/settings/billing?upgrade=${planParam}`
        : "/dashboard";
      await signIn("credentials", {
        email,
        password,
        callbackUrl,
      });
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  if (!registrationOpen) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#2563eb"/>
                <rect x="7" y="5" width="18" height="22" rx="1.5" fill="#fff"/>
                <text x="16" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#2563eb">$</text>
                <rect x="9" y="7" width="14" height="2" rx="1" fill="#93c5fd"/>
              </svg>
              <span className="text-xl font-bold text-gray-900">BankRead</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link href="/#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
              <Link href="/#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How It Works</Link>
              <Link href="/#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</Link>
              <Link href="/#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/sign-in" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                Sign In
              </Link>
            </div>

            <details className="md:hidden relative">
              <summary className="list-none cursor-pointer p-2 -mr-2 text-gray-600 hover:text-gray-900">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                <span className="sr-only">Open menu</span>
              </summary>
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                <Link href="/#features" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Features</Link>
                <Link href="/#how-it-works" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">How It Works</Link>
                <Link href="/#faq" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">FAQ</Link>
                <Link href="/#contact" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Contact</Link>
                <hr className="my-2 border-gray-100" />
                <Link href="/sign-in" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Sign In</Link>
              </div>
            </details>
          </div>
        </nav>
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full text-center space-y-4">
            <h2 className="text-3xl font-bold text-gray-900">
              Registration Closed
            </h2>
            <p className="text-gray-600">
              New account registration is currently closed.
            </p>
            <Link
              href="/sign-in"
              className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
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
                <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
                <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link>
              </div>
              <p className="text-sm">&copy; {new Date().getFullYear()} BankRead. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
              <rect x="4" y="2" width="24" height="28" rx="3" fill="#2563eb"/>
              <rect x="7" y="5" width="18" height="22" rx="1.5" fill="#fff"/>
              <text x="16" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#2563eb">$</text>
              <rect x="9" y="7" width="14" height="2" rx="1" fill="#93c5fd"/>
            </svg>
            <span className="text-xl font-bold text-gray-900">BankRead</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</Link>
            <Link href="/#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How It Works</Link>
            <Link href="/#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>
            <Link href="/#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</Link>
            <Link href="/#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
          </div>

          <details className="md:hidden relative">
            <summary className="list-none cursor-pointer p-2 -mr-2 text-gray-600 hover:text-gray-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              <span className="sr-only">Open menu</span>
            </summary>
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <Link href="/#features" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Features</Link>
              <Link href="/#how-it-works" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">How It Works</Link>
              <Link href="/#pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Pricing</Link>
              <Link href="/#faq" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">FAQ</Link>
              <Link href="/#contact" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Contact</Link>
              <hr className="my-2 border-gray-100" />
              <Link href="/sign-in" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Sign In</Link>
            </div>
          </details>
        </div>
      </nav>

      {/* Form — centered */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-200 p-8">
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Create your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization name{" "}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    id="orgName"
                    name="orgName"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" className="text-blue-600 hover:underline">
                    Terms of Service
                  </Link>
                  , including that BankRead is not liable or responsible for the accuracy of extracted data and that human review of results is required.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !termsAccepted}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          </div>
        </div>
      </div>

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
            <div className="flex items-center gap-6 text-sm flex-wrap justify-center">
              <Link href="/#features" className="hover:text-white transition-colors">Features</Link>
              <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/#faq" className="hover:text-white transition-colors">FAQ</Link>
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
