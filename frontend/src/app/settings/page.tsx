"use client";

import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";
import { ArrowLeft, CreditCard, Shield, Tag, ChevronRight } from "lucide-react";
import Link from "next/link";

const SETTINGS_ITEMS = [
  {
    href: "/settings/categories",
    icon: Tag,
    title: "Category Groups",
    description: "Manage category groups with auto-categorization rules",
  },
  {
    href: "/settings/billing",
    icon: CreditCard,
    title: "Billing & Plans",
    description: "Manage your subscription, upgrade or downgrade your plan",
  },
  {
    href: "/settings/security",
    icon: Shield,
    title: "Security",
    description: "Two-factor authentication and account protection",
  },
];

export default function SettingsPage() {
  const { data: session } = useSession();

  if (!session) return null;

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Manage your account</p>

        <div className="space-y-3">
          {SETTINGS_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <item.icon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">{item.title}</h2>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
