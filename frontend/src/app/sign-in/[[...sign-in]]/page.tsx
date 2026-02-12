"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === "true";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const urlError = searchParams.get("error");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!needs2FA) {
      // Step 1: Probe backend directly to check if 2FA is required
      try {
        const res = await fetch(`/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (res.status === 403) {
          const data = await res.json();
          if (data.detail === "2fa_required") {
            setNeeds2FA(true);
            setLoading(false);
            return;
          }
        }

        if (!res.ok) {
          setError("Invalid email or password");
          setLoading(false);
          return;
        }

        // No 2FA — sign in via NextAuth
        await signIn("credentials", { email, password, callbackUrl });
      } catch {
        setError("Unable to connect to server");
        setLoading(false);
      }
    } else {
      // Step 2: Sign in with TOTP code via NextAuth
      const result = await signIn("credentials", {
        email,
        password,
        totpCode,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid verification code");
        setLoading(false);
        return;
      }

      // Redirect on success
      window.location.href = callbackUrl;
    }
  };

  const displayError =
    error ||
    (urlError === "CredentialsSignin"
      ? "Invalid email or password"
      : urlError
        ? `Authentication error: ${urlError}`
        : "");

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
            {registrationOpen && <Link href="/#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</Link>}
            <Link href="/#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</Link>
            <Link href="/#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {registrationOpen && (
              <Link
                href="/sign-up"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get Started
              </Link>
            )}
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
              {registrationOpen && <Link href="/#pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Pricing</Link>}
              <Link href="/#faq" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">FAQ</Link>
              <Link href="/#contact" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Contact</Link>
              <hr className="my-2 border-gray-100" />
              {registrationOpen && (
                <Link href="/sign-up" className="block px-4 py-2 text-sm font-medium text-blue-600">Get Started</Link>
              )}
            </div>
          </details>
        </div>
      </nav>

      {/* Form — centered */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-200 p-8">
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Sign in to your account
            </h2>
            {registrationOpen && (
              <p className="mt-2 text-center text-sm text-gray-500">
                Or{" "}
                <Link
                  href="/sign-up"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  create a new account
                </Link>
              </p>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {displayError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {displayError}
                </div>
              )}

              {!needs2FA ? (
                <div className="space-y-4">
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
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                    Enter the 6-digit code from your authenticator app
                  </div>
                  <div>
                    <label htmlFor="totpCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Verification code
                    </label>
                    <input
                      id="totpCode"
                      name="totpCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      required
                      autoFocus
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                      className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm text-center text-2xl tracking-[0.5em] font-mono transition-colors"
                      placeholder="000000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNeeds2FA(false);
                      setTotpCode("");
                      setError("");
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Back to sign in
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading
                  ? needs2FA
                    ? "Verifying..."
                    : "Signing in..."
                  : needs2FA
                    ? "Verify"
                    : "Sign in"}
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
