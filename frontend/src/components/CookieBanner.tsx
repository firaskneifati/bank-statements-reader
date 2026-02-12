"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) {
      setVisible(true);
    }
  }, []);

  function accept(level: "all" | "necessary") {
    localStorage.setItem("cookie-consent", level);
    setVisible(false);

    if (level === "all" && typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        ad_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        analytics_storage: "granted",
      });
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 pointer-events-none">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 sm:p-6 pointer-events-auto">
        <p className="text-sm text-gray-600 leading-relaxed">
          We use cookies and local storage for authentication and to remember
          your preferences. See our{" "}
          <Link
            href="/privacy"
            className="text-blue-600 hover:text-blue-500 underline underline-offset-2"
          >
            Privacy Policy
          </Link>{" "}
          for details.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => accept("all")}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Accept All
          </button>
          <button
            onClick={() => accept("necessary")}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Necessary Only
          </button>
        </div>
      </div>
    </div>
  );
}
