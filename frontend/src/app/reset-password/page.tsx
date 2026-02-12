"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Something went wrong");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Nav */}
      <nav className="bg-white/95 backdrop-blur border-b border-gray-200">
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
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-200 p-8">
            {!token ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Invalid link</h2>
                <p className="mt-2 text-sm text-gray-500">
                  This password reset link is invalid. Please request a new one.
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Request new reset link
                </Link>
              </div>
            ) : success ? (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Password reset</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Your password has been updated successfully.
                </p>
                <Link
                  href="/sign-in"
                  className="mt-4 inline-flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            ) : (
              <>
                <h2 className="text-center text-2xl font-bold text-gray-900">
                  Set new password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-500">
                  Must be at least 8 characters with one uppercase letter and one digit.
                </p>

                <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      New password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      autoFocus
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? "Resetting..." : "Reset password"}
                  </button>
                </form>
              </>
            )}

            {!success && token && (
              <div className="mt-6 text-center">
                <Link href="/sign-in" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Back to sign in
                </Link>
              </div>
            )}
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
