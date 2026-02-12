export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  bankName: string;
  readingTime: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "convert-td-bank-statement-to-csv",
    title: "How to Convert TD Bank Statements to CSV or Excel",
    description:
      "Step-by-step guide to converting TD Canada Trust bank statements — PDF, scanned, or photo — into CSV or Excel spreadsheets using BankRead's AI-powered parser.",
    date: "2026-02-10",
    bankName: "TD Canada Trust",
    readingTime: "7 min read",
  },
  {
    slug: "convert-rbc-bank-statement-to-csv",
    title: "How to Convert RBC Bank Statements to CSV or Excel",
    description:
      "Learn how to extract transactions from RBC Royal Bank statements — PDF, scanned documents, or photos — and export to CSV or Excel with BankRead.",
    date: "2026-02-10",
    bankName: "RBC Royal Bank",
    readingTime: "7 min read",
  },
  {
    slug: "convert-bmo-bank-statement-to-csv",
    title: "How to Convert BMO Bank Statements to CSV or Excel",
    description:
      "Convert BMO Bank of Montreal statements — PDF, scanned, or photo — to structured CSV or Excel files automatically with AI-powered extraction.",
    date: "2026-02-10",
    bankName: "BMO",
    readingTime: "7 min read",
  },
  {
    slug: "convert-scotiabank-statement-to-csv",
    title: "How to Convert Scotiabank Statements to CSV or Excel",
    description:
      "Extract transactions from Scotiabank bank statements — PDF, scanned documents, or phone photos — and export to CSV or Excel using BankRead.",
    date: "2026-02-10",
    bankName: "Scotiabank",
    readingTime: "7 min read",
  },
  {
    slug: "convert-cibc-bank-statement-to-csv",
    title: "How to Convert CIBC Bank Statements to CSV or Excel",
    description:
      "Guide to converting CIBC bank statements — PDF, scanned, or photo — into clean CSV or Excel spreadsheets with AI categorization.",
    date: "2026-02-10",
    bankName: "CIBC",
    readingTime: "7 min read",
  },
  {
    slug: "convert-chase-bank-statement-to-csv",
    title: "How to Convert Chase Bank Statements to CSV or Excel",
    description:
      "Convert JPMorgan Chase bank statements — PDF, scanned documents, or photos — to CSV or Excel with automatic transaction extraction and AI categorization.",
    date: "2026-02-10",
    bankName: "Chase",
    readingTime: "7 min read",
  },
  {
    slug: "convert-bank-of-america-statement-to-csv",
    title: "How to Convert Bank of America Statements to CSV or Excel",
    description:
      "Extract and export Bank of America statement transactions — from PDF, scanned documents, or phone photos — to CSV or Excel using BankRead's AI converter.",
    date: "2026-02-10",
    bankName: "Bank of America",
    readingTime: "7 min read",
  },
  {
    slug: "convert-wells-fargo-statement-to-csv",
    title: "How to Convert Wells Fargo Statements to CSV or Excel",
    description:
      "Convert Wells Fargo bank statements — PDF, scanned, or photo — into structured CSV or Excel files with automated AI categorization.",
    date: "2026-02-10",
    bankName: "Wells Fargo",
    readingTime: "7 min read",
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
