"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/Header";
import { Shield, ShieldCheck, ShieldOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

async function authFetch(path: string, options: RequestInit = {}) {
  const session = await getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }
  return fetch(path, { ...options, headers });
}

type View = "status" | "setup" | "verify" | "disable";

export default function SecuritySettingsPage() {
  const { data: session } = useSession();
  const [view, setView] = useState<View>("status");
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Setup state
  const [otpauthUri, setOtpauthUri] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Disable state
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await authFetch("/api/v1/auth/me");
        if (res.ok) {
          const data = await res.json();
          setTotpEnabled(data.totp_enabled);
        }
      } catch {
        setError("Failed to load security settings");
      } finally {
        setLoading(false);
      }
    }
    if (session) fetchStatus();
  }, [session]);

  const handleStartSetup = async () => {
    setError("");
    setSuccess("");
    try {
      const res = await authFetch("/api/v1/auth/2fa/setup", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Failed to start 2FA setup");
        return;
      }
      const data = await res.json();
      setOtpauthUri(data.otpauth_uri);
      setSecret(data.secret);
      setView("verify");
    } catch {
      setError("Failed to connect to server");
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setVerifying(true);
    try {
      const res = await authFetch("/api/v1/auth/2fa/verify-setup", {
        method: "POST",
        body: JSON.stringify({ code: verifyCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Verification failed");
        setVerifying(false);
        return;
      }
      setTotpEnabled(true);
      setSuccess("Two-factor authentication has been enabled");
      setView("status");
      setVerifyCode("");
      setOtpauthUri("");
      setSecret("");
    } catch {
      setError("Failed to connect to server");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDisabling(true);
    try {
      const res = await authFetch("/api/v1/auth/2fa/disable", {
        method: "POST",
        body: JSON.stringify({ password: disablePassword, code: disableCode }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "Failed to disable 2FA");
        setDisabling(false);
        return;
      }
      setTotpEnabled(false);
      setSuccess("Two-factor authentication has been disabled");
      setView("status");
      setDisablePassword("");
      setDisableCode("");
    } catch {
      setError("Failed to connect to server");
    } finally {
      setDisabling(false);
    }
  };

  if (!session) return null;

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Security Settings</h1>
        <p className="text-gray-600 mb-8">Manage your account security</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-6">
            {success}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500">Loading...</div>
        ) : view === "status" ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start gap-4">
              {totpEnabled ? (
                <ShieldCheck className="h-8 w-8 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <Shield className="h-8 w-8 text-gray-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  Two-Factor Authentication
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {totpEnabled
                    ? "Your account is protected with an authenticator app."
                    : "Add an extra layer of security by requiring a verification code from your authenticator app."}
                </p>
                <div className="mt-4">
                  {totpEnabled ? (
                    <button
                      onClick={() => {
                        setView("disable");
                        setError("");
                        setSuccess("");
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <ShieldOff className="h-4 w-4" />
                      Disable 2FA
                    </button>
                  ) : (
                    <button
                      onClick={handleStartSetup}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    >
                      <Shield className="h-4 w-4" />
                      Enable 2FA
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : view === "verify" ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Set Up Authenticator App</h2>
              <p className="text-sm text-gray-600 mt-1">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
              </p>
            </div>

            <div className="flex justify-center py-4">
              <div className="bg-white p-4 rounded-lg border border-gray-100">
                <QRCodeSVG value={otpauthUri} size={200} />
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                Can&apos;t scan? Enter this key manually:
              </p>
              <code className="text-sm font-mono text-gray-800 break-all select-all">
                {secret}
              </code>
            </div>

            <form onSubmit={handleVerifySetup} className="space-y-4">
              <div>
                <label htmlFor="verifyCode" className="block text-sm font-medium text-gray-700">
                  Enter the 6-digit code from your app
                </label>
                <input
                  id="verifyCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setView("status");
                    setVerifyCode("");
                    setError("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying || verifyCode.length !== 6}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? "Verifying..." : "Verify & Enable"}
                </button>
              </div>
            </form>
          </div>
        ) : view === "disable" ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Disable Two-Factor Authentication</h2>
            <p className="text-sm text-gray-600 mb-6">
              Enter your password and a verification code to confirm.
            </p>
            <form onSubmit={handleDisable} className="space-y-4">
              <div>
                <label htmlFor="disablePassword" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="disablePassword"
                  type="password"
                  required
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="disableCode" className="block text-sm font-medium text-gray-700">
                  Authenticator code
                </label>
                <input
                  id="disableCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setView("status");
                    setDisablePassword("");
                    setDisableCode("");
                    setError("");
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabling || disableCode.length !== 6}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {disabling ? "Disabling..." : "Disable 2FA"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </>
  );
}
