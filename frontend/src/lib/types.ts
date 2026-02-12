export interface CategoryConfig {
  name: string;
  description: string;
}

export const DEFAULT_CATEGORIES: CategoryConfig[] = [
  { name: "Payroll & Income", description: "Salary, wages, direct deposits, government payments, tax refunds" },
  { name: "Rent & Mortgage", description: "Rent payments, mortgage payments, property-related" },
  { name: "Utilities", description: "Hydro, gas, electric, internet, phone, cable" },
  { name: "Groceries", description: "Supermarkets, grocery stores, food shopping" },
  { name: "Dining", description: "Restaurants, fast food, coffee shops, food delivery" },
  { name: "Transportation", description: "Transit, gas stations, parking, ride-sharing, car payments" },
  { name: "Insurance", description: "Any insurance premiums" },
  { name: "Subscriptions", description: "Streaming, software, memberships, recurring digital services" },
  { name: "E-Transfer", description: "Interac e-transfers (sent or received)" },
  { name: "Bank Fees", description: "Account fees, service charges, overdraft fees, interest charges" },
  { name: "Shopping", description: "Retail stores, online shopping, Amazon, clothing" },
  { name: "Health & Wellness", description: "Pharmacy, dental, medical, gym, fitness" },
  { name: "Entertainment", description: "Movies, concerts, sports, hobbies, gaming" },
  { name: "Business Expense", description: "Office supplies, software, professional services, business transfers" },
  { name: "Transfers", description: "Transfers between own accounts, bill payments, loan payments" },
  { name: "Other", description: "Only if none of the above fit" },
];

export interface Transaction {
  date: string;
  posting_date: string | null;
  description: string;
  amount: number;
  type: "debit" | "credit";
  balance: number | null;
  category: string;
  source?: string;
  sourceColor?: { bg: string; text: string; border: string; activeBg: string };
}

export interface StatementResult {
  filename: string;
  transactions: Transaction[];
  total_debits: number;
  total_credits: number;
  transaction_count: number;
  page_count: number;
  actual_pages: number;
  processing_type?: "text" | "image" | "ocr";
  ocr_confidence?: number | null;
}

export interface UsageStats {
  total_uploads: number;
  total_documents: number;
  total_pages: number;
  total_actual_pages: number;
  total_text_pages: number;
  total_image_pages: number;
  total_transactions: number;
  total_exports: number;
  total_bytes_processed: number;
  month_uploads: number;
  month_documents: number;
  month_pages: number;
  month_actual_pages: number;
  month_text_pages: number;
  month_image_pages: number;
  month_transactions: number;
  month_exports: number;
  month_bytes_processed: number;
  page_limit: number | null;
  plan: string;
}

export interface BillingStatus {
  plan: string;
  page_limit: number | null;
  month_pages: number;
  stripe_subscription_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
}

export interface UploadResponse {
  statements: StatementResult[];
  mock_mode: boolean;
  usage: UsageStats | null;
}

export interface ExportRequest {
  transactions: Transaction[];
  format: "csv" | "xlsx";
  filename: string;
}
