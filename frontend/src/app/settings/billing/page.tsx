"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { ArrowLeft, Check, CreditCard, Zap } from "lucide-react";
import Link from "next/link";
import {
  fetchBillingStatus,
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  syncBilling,
} from "@/lib/api-client";
import type { BillingStatus } from "@/lib/types";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "CA$0",
    period: "/mo",
    pages: 10,
    features: ["10 pages/month", "CSV & Excel export", "AI categorization"],
  },
  {
    id: "basic",
    name: "Basic",
    price: "CA$15",
    period: "/mo",
    pages: 100,
    features: [
      "100 pages/month",
      "CSV & Excel export",
      "AI categorization",
      "Email support",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    price: "CA$49",
    period: "/mo",
    pages: 400,
    features: [
      "400 pages/month",
      "CSV & Excel export",
      "AI categorization",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "CA$199",
    period: "/mo",
    pages: 2000,
    features: [
      "2,000 pages/month",
      "CSV & Excel export",
      "AI categorization",
      "Priority support",
    ],
    popular: true,
  },
  {
    id: "business",
    name: "Business",
    price: "CA$499",
    period: "/mo",
    pages: 10000,
    features: [
      "10,000 pages/month",
      "CSV & Excel export",
      "AI categorization",
      "Dedicated support",
    ],
  },
];

const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === "true";

export default function BillingPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (searchParams.get("cancelled") === "true") {
      setError("Checkout was cancelled.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!session) return;

    async function loadBilling() {
      try {
        // If returning from successful checkout, sync subscription from Stripe first
        if (searchParams.get("success") === "true") {
          await syncBilling();
          setSuccess("Subscription activated! Your plan has been updated.");
        }
        const status = await fetchBillingStatus();
        setBilling(status);

        // Auto-trigger checkout if redirected from sign-up with a plan choice
        const upgradePlan = searchParams.get("upgrade");
        if (upgradePlan && upgradePlan !== "free" && status.plan === "free") {
          setActionLoading(upgradePlan);
          try {
            const { url } = await createCheckoutSession(upgradePlan);
            window.location.href = url;
            return;
          } catch {
            setError("Failed to start checkout. You can upgrade manually below.");
          } finally {
            setActionLoading(null);
          }
        }
      } catch {
        setError("Failed to load billing status");
      } finally {
        setLoading(false);
      }
    }

    loadBilling();
  }, [session, searchParams]);

  const handleUpgrade = async (planId: string) => {
    setError("");
    setActionLoading(planId);
    try {
      const { url } = await createCheckoutSession(planId);
      window.location.href = url;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      // If they already have a subscription, redirect to portal
      if (message.includes("customer portal")) {
        try {
          const { url } = await createPortalSession();
          window.location.href = url;
          return;
        } catch {
          setError("Failed to open subscription management portal");
        }
      } else {
        setError(message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setError("");
    setActionLoading("portal");
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch {
      setError("Failed to open subscription management portal");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setError("");
    setActionLoading("cancel");
    try {
      await cancelSubscription();
      setSuccess("Your subscription will be cancelled at the end of the current billing period. You'll keep your plan until then.");
      setShowCancelConfirm(false);
      const updated = await fetchBillingStatus();
      setBilling(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setActionLoading(null);
    }
  };

  if (!session) return null;

  // Show a clean redirect screen when auto-upgrading from sign-up flow
  const upgradePlan = searchParams.get("upgrade");
  if (upgradePlan && upgradePlan !== "free" && (loading || actionLoading)) {
    return (
      <>
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Redirecting to secure checkout...</h2>
          <p className="text-sm text-gray-500 mt-1">Setting up your {upgradePlan} plan via Stripe.</p>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mt-4">
              {error}
            </div>
          )}
        </div>
      </>
    );
  }

  const currentPlan = billing?.plan || "free";

  return (
    <>
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
          {billing?.stripe_subscription_id && (
            <button
              onClick={handleManageSubscription}
              disabled={actionLoading === "portal"}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4" />
              {actionLoading === "portal" ? "Opening..." : "Manage Subscription"}
            </button>
          )}
        </div>
        <p className="text-gray-600 mb-8">
          Choose a plan that fits your needs. Upgrade or downgrade anytime.
        </p>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-10 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Current usage summary */}
            {billing && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Current plan:</span>{" "}
                  <span className="capitalize">{currentPlan}</span>
                  {billing.page_limit && (
                    <>
                      {" "}&middot;{" "}
                      <span className="font-medium">{billing.month_pages.toLocaleString()}</span> / {billing.page_limit.toLocaleString()} pages used this month
                    </>
                  )}
                  {billing.current_period_end && (
                    <>
                      {" "}&middot; Renews{" "}
                      {new Date(billing.current_period_end * 1000).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Cancellation pending notice */}
            {billing?.cancel_at_period_end && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
                <p className="text-sm text-amber-700">
                  Your subscription is set to cancel on{" "}
                  <span className="font-medium">
                    {billing.current_period_end
                      ? new Date(billing.current_period_end * 1000).toLocaleDateString()
                      : "the end of your billing period"}
                  </span>
                  . You&apos;ll keep your current plan until then.
                </p>
              </div>
            )}

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              {PLANS.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                const isDowngrade =
                  PLANS.findIndex((p) => p.id === currentPlan) >
                  PLANS.findIndex((p) => p.id === plan.id);

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-xl border-2 p-6 transition-shadow ${
                      isCurrent
                        ? "border-blue-500 shadow-md"
                        : plan.popular
                          ? "border-blue-200 shadow-sm"
                          : "border-gray-200"
                    }`}
                  >
                    {plan.popular && !isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                          Popular
                        </span>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                          Current Plan
                        </span>
                      </div>
                    )}

                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                        <span className="text-gray-500">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <div className="w-full py-2 text-center text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">
                        Active
                      </div>
                    ) : plan.id === "free" ? (
                      // No button for free plan — handled by cancel
                      <div className="w-full py-2 text-center text-sm text-gray-400">
                        {currentPlan === "free" ? "" : "Cancel to downgrade"}
                      </div>
                    ) : !registrationOpen ? (
                      <div className="w-full py-2 text-center text-sm text-gray-400">
                        Coming soon
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={actionLoading !== null}
                        className={`w-full py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                          isDowngrade
                            ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
                            : "text-white bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        {actionLoading === plan.id ? (
                          "Redirecting..."
                        ) : (
                          <>
                            <Zap className="h-3.5 w-3.5 inline mr-1" />
                            {isDowngrade ? "Downgrade" : "Upgrade"}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Cancel subscription */}
            {billing?.stripe_subscription_id && currentPlan !== "free" && !billing?.cancel_at_period_end && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Cancel Subscription</h2>
                <p className="text-sm text-gray-600 mb-4">
                  You&apos;ll keep your {currentPlan} plan until the end of your billing period
                  {billing?.current_period_end && (
                    <> ({new Date(billing.current_period_end * 1000).toLocaleDateString()})</>
                  )}. After that, you&apos;ll be moved to the Free plan (10 pages/month).
                </p>
                {showCancelConfirm ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-700 font-medium mb-3">
                      Are you sure you want to cancel your {currentPlan} subscription?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCancelConfirm(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        Keep Subscription
                      </button>
                      <button
                        onClick={handleCancelSubscription}
                        disabled={actionLoading === "cancel"}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading === "cancel" ? "Cancelling..." : "Yes, Cancel Subscription"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    Cancel Subscription
                  </button>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </>
  );
}
