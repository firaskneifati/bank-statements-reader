import { auth } from "@/auth";
import Link from "next/link";
import {
  FileText,
  Brain,
  Download,
  Files,
  Shield,
  Tags,
  Upload,
  Cpu,
  FileSpreadsheet,
  Check,
  ChevronRight,
  Mail,
} from "lucide-react";
import { ContactForm } from "@/components/ContactForm";

const FEATURES = [
  {
    icon: FileText,
    title: "PDF Statement Parsing",
    description:
      "Upload any bank statement PDF and extract every transaction automatically. Supports all major Canadian and international banks.",
  },
  {
    icon: Brain,
    title: "AI Categorization",
    description:
      "Transactions are automatically categorized using AI — groceries, rent, utilities, and more. No manual tagging required.",
  },
  {
    icon: Download,
    title: "CSV & Excel Export",
    description:
      "Export your parsed transactions to CSV or Excel with one click. Ready for your accounting software or spreadsheet.",
  },
  {
    icon: Files,
    title: "Multi-Statement Upload",
    description:
      "Upload multiple statements at once. Combine months of data into a single exportable view with color-coded sources.",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description:
      "Your files are processed and never stored. Two-factor authentication, encrypted connections, and privacy by design.",
  },
  {
    icon: Tags,
    title: "Custom Categories",
    description:
      "Define your own transaction categories with custom keywords. The AI learns your preferences for accurate results.",
  },
];

const STEPS = [
  {
    icon: Upload,
    step: "1",
    title: "Upload Your Statement",
    description: "Drag and drop your bank statement PDF. We support all major bank formats.",
  },
  {
    icon: Cpu,
    step: "2",
    title: "AI Processes It",
    description: "Our AI extracts every transaction, categorizes it, and calculates totals.",
  },
  {
    icon: FileSpreadsheet,
    step: "3",
    title: "Export Your Data",
    description: "Download clean, structured data as CSV or Excel. Ready in seconds.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "CA$0",
    period: "/mo",
    pages: "10 pages/month",
    features: ["10 pages/month", "CSV & Excel export", "AI categorization"],
  },
  {
    name: "Starter",
    price: "CA$49",
    period: "/mo",
    pages: "400 pages/month",
    features: ["400 pages/month", "CSV & Excel export", "AI categorization", "Email support"],
  },
  {
    name: "Pro",
    price: "CA$199",
    period: "/mo",
    pages: "2,000 pages/month",
    popular: true,
    features: ["2,000 pages/month", "CSV & Excel export", "AI categorization", "Priority support"],
  },
  {
    name: "Business",
    price: "CA$499",
    period: "/mo",
    pages: "10,000 pages/month",
    features: [
      "10,000 pages/month",
      "CSV & Excel export",
      "AI categorization",
      "Dedicated support",
    ],
  },
];

const FAQS = [
  {
    question: "Which banks does BankRead support?",
    answer:
      "BankRead supports PDF statements from all major Canadian banks including TD, RBC, BMO, Scotiabank, CIBC, and more. It also works with most international bank statement PDFs that follow standard formatting.",
  },
  {
    question: "Is my financial data secure?",
    answer:
      "Yes. Your bank statements are processed in memory and never stored on our servers. We use encrypted HTTPS connections, optional two-factor authentication, and follow privacy-by-design principles. Your data is yours alone.",
  },
  {
    question: "How accurate is the AI categorization?",
    answer:
      "Our AI categorization is highly accurate for common transaction types like groceries, rent, utilities, and subscriptions. You can also define custom categories with keywords to improve accuracy for your specific needs.",
  },
  {
    question: "Can I export to my accounting software?",
    answer:
      "Yes. BankRead exports to CSV and Excel formats, which are compatible with QuickBooks, Xero, Wave, FreshBooks, and virtually every accounting application on the market.",
  },
  {
    question: "What happens if I exceed my monthly page limit?",
    answer:
      "You'll be notified when you're approaching your limit. Once reached, you can upgrade to a higher plan instantly to continue processing. Unused pages do not roll over to the next month.",
  },
];

function BankReadLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="2" width="24" height="28" rx="3" fill="#2563eb" />
      <rect x="7" y="5" width="18" height="22" rx="1.5" fill="#fff" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fontFamily="Arial,sans-serif"
        fontWeight="bold"
        fontSize="14"
        fill="#2563eb"
      >
        $
      </text>
      <rect x="9" y="7" width="14" height="2" rx="1" fill="#93c5fd" />
    </svg>
  );
}

export default async function LandingPage() {
  const session = await auth();
  const isLoggedIn = !!session?.user;
  const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === "true";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "BankRead",
        url: "https://bankread.ai",
        description:
          "AI-powered bank statement reader that extracts transactions from PDF statements and exports to CSV or Excel.",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: PLANS.map((plan) => ({
          "@type": "Offer",
          name: plan.name,
          price: plan.price.replace("CA$", ""),
          priceCurrency: "CAD",
          description: plan.pages,
        })),
      },
      {
        "@type": "Organization",
        name: "BankRead",
        url: "https://bankread.ai",
        logo: "https://bankread.ai/icon.svg",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Sticky Nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <BankReadLogo className="h-7 w-7" />
            <span className="text-xl font-bold text-gray-900">BankRead</span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
            {registrationOpen && <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>}
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
            <a href="#contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Dashboard
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Sign In
                </Link>
                {registrationOpen && (
                  <Link
                    href="/sign-up"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Get Started
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile menu — zero JS using <details> */}
          <details className="md:hidden relative">
            <summary className="list-none cursor-pointer p-2 -mr-2 text-gray-600 hover:text-gray-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              <span className="sr-only">Open menu</span>
            </summary>
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
              <a href="#features" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Features</a>
              <a href="#how-it-works" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">How It Works</a>
              {registrationOpen && <a href="#pricing" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Pricing</a>}
              <a href="#faq" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">FAQ</a>
              <a href="#contact" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Contact</a>
              <hr className="my-2 border-gray-100" />
              {isLoggedIn ? (
                <Link href="/dashboard" className="block px-4 py-2 text-sm font-medium text-blue-600">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Sign In</Link>
                  {registrationOpen && (
                    <Link href="/sign-up" className="block px-4 py-2 text-sm font-medium text-blue-600">Get Started</Link>
                  )}
                </>
              )}
            </div>
          </details>
        </div>
      </nav>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 animate-fade-in-up">
                Turn Bank Statements into{" "}
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Clean Data
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto animate-fade-in-up delay-100">
                Upload any PDF bank statement. Our AI extracts every transaction,
                categorizes it, and exports to CSV or Excel — in seconds.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up delay-200">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
                  >
                    Go to Dashboard
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                ) : (
                  <>
                    {registrationOpen && (
                      <Link
                        href="/sign-up"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white text-base font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/25"
                      >
                        Get Started Free
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    )}
                    <Link
                      href="/sign-in"
                      className={`inline-flex items-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl transition-colors ${
                        registrationOpen
                          ? "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                          : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25"
                      }`}
                    >
                      Sign In
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* CSS-only app mockup */}
            <div className="mt-16 max-w-2xl mx-auto animate-fade-in-up delay-300">
              <div className="bg-white rounded-2xl shadow-2xl shadow-gray-200/60 border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-4 text-xs text-gray-400 font-mono">bankread.ai/dashboard</span>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="h-3 w-40 bg-gray-200 rounded" />
                      <div className="h-2 w-24 bg-gray-100 rounded mt-2" />
                    </div>
                  </div>
                  <div className="border border-gray-100 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-4 gap-px bg-gray-100">
                      <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">Date</div>
                      <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">Description</div>
                      <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500">Category</div>
                      <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 text-right">Amount</div>
                    </div>
                    {[
                      { date: "Jan 15", desc: "Grocery Store", cat: "Groceries", amount: "-$84.32", color: "text-red-600" },
                      { date: "Jan 14", desc: "Salary Deposit", cat: "Income", amount: "+$3,200.00", color: "text-green-600" },
                      { date: "Jan 13", desc: "Electric Company", cat: "Utilities", amount: "-$142.50", color: "text-red-600" },
                    ].map((row, i) => (
                      <div key={i} className="grid grid-cols-4 gap-px bg-gray-100">
                        <div className="bg-white px-3 py-2 text-xs text-gray-600">{row.date}</div>
                        <div className="bg-white px-3 py-2 text-xs text-gray-900">{row.desc}</div>
                        <div className="bg-white px-3 py-2">
                          <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700">{row.cat}</span>
                        </div>
                        <div className={`bg-white px-3 py-2 text-xs font-medium text-right ${row.color}`}>{row.amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-heading" className="bg-white py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-gray-900">
                Everything you need to parse bank statements
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                From PDF upload to clean spreadsheet — fully automated with AI.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-gray-50 rounded-2xl p-8 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-5">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" aria-labelledby="how-it-works-heading" className="bg-gray-50 py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 id="how-it-works-heading" className="text-3xl sm:text-4xl font-bold text-gray-900">
                Three steps to clean data
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                No complex setup. No learning curve. Just upload and export.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {STEPS.map((step) => (
                <div key={step.step} className="text-center">
                  <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-600/25">
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-sm font-bold text-blue-600 mb-2">Step {step.step}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        {registrationOpen && (
        <section id="pricing" aria-labelledby="pricing-heading" className="bg-white py-20 sm:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold text-gray-900">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Start free. Upgrade when you need more pages.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative bg-white rounded-2xl p-8 transition-shadow ${
                    plan.popular
                      ? "border-2 border-blue-500 shadow-lg"
                      : "border border-gray-200 hover:shadow-md"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={isLoggedIn ? "/settings/billing" : registrationOpen ? `/sign-up?plan=${plan.name.toLowerCase()}` : "/sign-in"}
                    className={`block w-full text-center py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      plan.popular
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {isLoggedIn ? "Manage Plan" : registrationOpen ? "Get Started" : "Sign In"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-heading" className="bg-gray-50 py-20 sm:py-28">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
              Frequently asked questions
            </h2>
            <div className="space-y-4">
              {FAQS.map((faq) => (
                <details
                  key={faq.question}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <summary className="flex items-center justify-between cursor-pointer px-6 py-5 text-left text-gray-900 font-medium hover:bg-gray-50 transition-colors [&::-webkit-details-marker]:hidden list-none">
                    {faq.question}
                    <ChevronRight className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0 ml-4" />
                  </summary>
                  <div className="px-6 pb-5 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" aria-labelledby="contact-heading" className="bg-white py-20 sm:py-28">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h2 id="contact-heading" className="text-3xl sm:text-4xl font-bold text-gray-900">
                Get in touch
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Have a question or need help? Send us a message and we'll respond within 24 hours.
              </p>
            </div>
            <ContactForm />
          </div>
        </section>

        {/* Final CTA */}
        <section aria-label="Get started" className="bg-gradient-to-r from-blue-600 to-indigo-600 py-20 sm:py-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Ready to automate your bank statements?
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              Join thousands of professionals who save hours every month with BankRead.
            </p>
            <div className="mt-8">
              <Link
                href={isLoggedIn ? "/dashboard" : registrationOpen ? "/sign-up" : "/sign-in"}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-600 text-base font-semibold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
              >
                {isLoggedIn ? "Go to Dashboard" : registrationOpen ? "Get Started Free" : "Sign In"}
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <BankReadLogo className="h-6 w-6" />
              <span className="text-white font-semibold">BankRead</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              {registrationOpen && <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>}
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
              <Link href="/sign-in" className="hover:text-white transition-colors">Sign In</Link>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} BankRead. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
