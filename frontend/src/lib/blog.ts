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
      "Step-by-step guide to converting TD Canada Trust PDF bank statements into CSV or Excel spreadsheets using BankRead's AI-powered parser.",
    date: "2026-02-10",
    bankName: "TD Canada Trust",
    readingTime: "7 min read",
  },
  {
    slug: "convert-rbc-bank-statement-to-csv",
    title: "How to Convert RBC Bank Statements to CSV or Excel",
    description:
      "Learn how to extract transactions from RBC Royal Bank PDF statements and export them to CSV or Excel with BankRead.",
    date: "2026-02-10",
    bankName: "RBC Royal Bank",
    readingTime: "7 min read",
  },
  {
    slug: "convert-bmo-bank-statement-to-csv",
    title: "How to Convert BMO Bank Statements to CSV or Excel",
    description:
      "Convert BMO Bank of Montreal PDF statements to structured CSV or Excel files automatically with AI-powered extraction.",
    date: "2026-02-10",
    bankName: "BMO",
    readingTime: "7 min read",
  },
  {
    slug: "convert-scotiabank-statement-to-csv",
    title: "How to Convert Scotiabank Statements to CSV or Excel",
    description:
      "Extract transactions from Scotiabank PDF bank statements and export to CSV or Excel using BankRead's automated parser.",
    date: "2026-02-10",
    bankName: "Scotiabank",
    readingTime: "7 min read",
  },
  {
    slug: "convert-cibc-bank-statement-to-csv",
    title: "How to Convert CIBC Bank Statements to CSV or Excel",
    description:
      "Guide to converting CIBC PDF bank statements into clean CSV or Excel spreadsheets with AI categorization.",
    date: "2026-02-10",
    bankName: "CIBC",
    readingTime: "7 min read",
  },
  {
    slug: "convert-chase-bank-statement-to-csv",
    title: "How to Convert Chase Bank Statements to CSV or Excel",
    description:
      "Convert JPMorgan Chase PDF bank statements to CSV or Excel files with automatic transaction extraction and categorization.",
    date: "2026-02-10",
    bankName: "Chase",
    readingTime: "7 min read",
  },
  {
    slug: "convert-bank-of-america-statement-to-csv",
    title: "How to Convert Bank of America Statements to CSV or Excel",
    description:
      "Extract and export Bank of America PDF statement transactions to CSV or Excel using BankRead's AI-powered converter.",
    date: "2026-02-10",
    bankName: "Bank of America",
    readingTime: "7 min read",
  },
  {
    slug: "convert-wells-fargo-statement-to-csv",
    title: "How to Convert Wells Fargo Statements to CSV or Excel",
    description:
      "Convert Wells Fargo PDF bank statements into structured CSV or Excel files with automated AI categorization.",
    date: "2026-02-10",
    bankName: "Wells Fargo",
    readingTime: "7 min read",
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
