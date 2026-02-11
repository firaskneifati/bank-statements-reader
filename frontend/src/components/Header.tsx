"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function Header() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Bank Statement Reader
          </h1>
          <p className="text-sm text-gray-500">
            Upload PDF statements to extract and export transactions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {session.user.name || session.user.email}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {session.user.role}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
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
