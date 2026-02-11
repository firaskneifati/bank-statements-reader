"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              href="/sign-up"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              create a new account
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {displayError}
            </div>
          )}

          {!needs2FA ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
                Enter the 6-digit code from your authenticator app
              </div>
              <div>
                <label htmlFor="totpCode" className="block text-sm font-medium text-gray-700">
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-2xl tracking-[0.5em] font-mono"
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
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
  );
}
