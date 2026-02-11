"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

export function Header() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="group">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
              <rect x="4" y="2" width="24" height="28" rx="3" fill="#2563eb"/>
              <rect x="7" y="5" width="18" height="22" rx="1.5" fill="#fff"/>
              <text x="16" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#2563eb">$</text>
              <rect x="9" y="7" width="14" height="2" rx="1" fill="#93c5fd"/>
            </svg>
            BankRead
          </h1>
          <p className="text-sm text-gray-500">
            Upload PDF statements to extract and export transactions
          </p>
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {session.user.name || session.user.email}
            </p>
          </div>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>
          <button
            onClick={() => {
              sessionStorage.removeItem("bank-statement-results");
              signOut({ callbackUrl: "/sign-in" });
            }}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
