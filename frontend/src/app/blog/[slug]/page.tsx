import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogPosts, getPostBySlug } from "@/lib/blog";

/* ---------- static generation ---------- */

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

/* ---------- per-post SEO metadata ---------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `https://bankread.ai/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://bankread.ai/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      siteName: "BankRead",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

/* ---------- bank-specific content ---------- */

interface FAQ {
  question: string;
  answer: string;
}

interface BankContent {
  intro: string;
  statementFormat: string;
  downloadSteps: string[];
  extractedFields: string[];
  pdfTips: string[];
  commonIssues: string[];
  faqs: FAQ[];
}

const bankContent: Record<string, BankContent> = {
  "convert-td-bank-statement-to-csv": {
    intro:
      "TD Canada Trust is Canada's largest bank by total assets and serves over 16 million customers. Every month, TD generates PDF bank statements that contain detailed transaction histories for chequing, savings, and credit card accounts. Accountants, bookkeepers, and small business owners frequently need this data in spreadsheet format — for tax preparation, expense categorization, cash flow analysis, or reconciliation with accounting software. Manually retyping transactions from a TD PDF is tedious, slow, and error-prone. BankRead eliminates that entirely: upload your TD statement PDF, and the AI extracts every transaction into a clean, structured table you can export as CSV or Excel.",
    statementFormat:
      "TD chequing and savings statements use a portrait-oriented PDF layout. Transactions appear in a single table with columns for Date, Description, Withdrawals, Deposits, and Balance. Each page typically contains 20–30 transactions. The statement header includes your account number, statement period, opening balance, and closing balance. TD Visa credit card statements have a different layout: they show a transaction summary section at the top (payments, purchases, interest) followed by a detailed transaction list with Date, Transaction Description, and Amount. Both formats are fully supported by BankRead.",
    downloadSteps: [
      "Log in to TD EasyWeb online banking at easyweb.td.com using your access card number and password.",
      "From the Accounts overview, click on the specific chequing or savings account.",
      "Click 'Statements' (or 'eStatements') in the account navigation menu.",
      "Select the statement period you need — TD keeps up to 7 years of eStatements.",
      "Click the PDF icon to download. Save the file to your computer (e.g., 'TD-Jan-2026.pdf').",
    ],
    extractedFields: [
      "Transaction date (posted date as shown on the statement)",
      "Description / payee name (e.g., 'INTERAC PURCHASE — LOBLAWS #1234')",
      "Debit amount (withdrawals, purchases, fees)",
      "Credit amount (deposits, refunds, interest)",
      "Running balance after each transaction",
      "AI-assigned category (e.g., Groceries, Utilities, Income, Transfer)",
    ],
    pdfTips: [
      "TD statements list transactions in chronological order with a running balance column — BankRead preserves this order in the output.",
      "Multi-page statements (e.g., 3–4 pages for a busy month) are handled automatically in a single upload.",
      "TD credit card statements have a separate layout from chequing accounts — upload either type and BankRead detects the format.",
      "If your TD eStatement is password-protected (some older statements are), remove the password first using your browser's print-to-PDF feature.",
      "TD business account statements may include a cheque image section — BankRead skips images and extracts only the transaction table.",
    ],
    commonIssues: [
      "TD eStatements older than 2015 may use a scanned image format rather than selectable text. BankRead's AI handles both, but text-based PDFs are faster to process.",
      "Some TD statements include a 'Daily Balance Summary' section at the end — this is separate from the transaction list and won't create duplicate entries.",
      "TD USD accounts generate statements in US dollars. BankRead extracts the values as-is; currency conversion is not applied.",
    ],
    faqs: [
      {
        question: "Can BankRead convert TD Visa credit card statements?",
        answer:
          "Yes. BankRead supports both TD chequing/savings statements and TD Visa credit card statements. The AI automatically detects the statement type and extracts transactions from the detailed transaction section, including the date, merchant name, and amount.",
      },
      {
        question: "How far back can I convert TD statements?",
        answer:
          "You can convert any TD statement you have as a PDF. TD EasyWeb typically stores eStatements for up to 7 years. Download the PDFs you need and upload them to BankRead — there's no limit on statement age.",
      },
      {
        question: "Does BankRead handle multi-account TD statements?",
        answer:
          "If your TD statement PDF contains transactions from multiple accounts (e.g., a joint statement), BankRead extracts all transactions from the PDF. You can use the AI categorization and filtering in the export to separate them as needed.",
      },
    ],
  },
  "convert-rbc-bank-statement-to-csv": {
    intro:
      "RBC Royal Bank is Canada's largest bank by market capitalization and serves over 17 million clients. RBC PDF statements are densely formatted, packing transaction data into compact tables that are notoriously difficult to copy-paste into spreadsheets — cell boundaries break, amounts misalign, and descriptions get truncated. Whether you're a business owner reconciling monthly expenses, a freelancer tracking income, or an accountant preparing year-end reports, BankRead's AI parser reads RBC's exact layout and extracts every transaction cleanly, with date, description, and amount mapped to the correct columns.",
    statementFormat:
      "RBC chequing statements use a landscape-oriented PDF with a two-column approach: one column for Withdrawals (debits) and another for Deposits (credits). Each transaction row shows the Date, Description, and Amount. The statement header shows the account number, transit number, statement period, and opening/closing balances. RBC Visa statements use a portrait layout with a single Amount column (negative for charges, positive for payments/credits). Transaction descriptions on RBC statements often include the merchant category code abbreviation and city.",
    downloadSteps: [
      "Sign in to RBC Online Banking at royalbank.com with your client card number and password.",
      "Click on the account name from your accounts overview page.",
      "Select 'Statements & Documents' from the account sidebar navigation.",
      "Choose the statement period from the dropdown — RBC stores up to 7 years of eStatements.",
      "Click 'View Statement' to open the PDF in your browser, then download/save it.",
    ],
    extractedFields: [
      "Transaction date (posted date)",
      "Description / payee (e.g., 'POS PURCHASE — SHOPPERS DRUG MART TORONTO ON')",
      "Withdrawals (debit amounts in the withdrawals column)",
      "Deposits (credit amounts in the deposits column)",
      "Balance after transaction",
      "AI-assigned category (e.g., Health & Pharmacy, Dining, Transfer)",
    ],
    pdfTips: [
      "RBC's two-column layout (Withdrawals | Deposits) is correctly mapped by BankRead — debits and credits go into the right columns in your CSV/Excel.",
      "RBC Visa statements use a single-amount column with sign notation. BankRead correctly parses payments (credits) vs. charges (debits).",
      "Cheque numbers appear in the description field when a cheque clears — BankRead preserves this information.",
      "Foreign currency transactions show the CAD equivalent on the statement. BankRead extracts the CAD amount and includes the original currency in the description.",
      "RBC statements may include an 'Account Activity Summary' section — this is not duplicated in the extracted transactions.",
    ],
    commonIssues: [
      "RBC's landscape PDF layout sometimes causes issues when printing — if you re-save the PDF, make sure to keep the original orientation for best results.",
      "Some RBC business accounts use a different statement template with additional columns for reference numbers. BankRead handles both personal and business templates.",
      "RBC eStatements prior to 2012 may be in image-only PDF format. These take slightly longer to process but are still supported.",
    ],
    faqs: [
      {
        question: "Can I convert RBC Visa and chequing statements together?",
        answer:
          "Yes. You can upload multiple RBC statements in one session. BankRead processes each PDF independently and you can export them separately or view all transactions combined.",
      },
      {
        question: "Does BankRead handle RBC's two-column withdrawal/deposit layout?",
        answer:
          "Yes. BankRead's AI is specifically trained to understand RBC's two-column format where withdrawals and deposits appear in separate columns. The exported CSV/Excel maintains this separation with distinct debit and credit columns.",
      },
      {
        question: "Are RBC business banking statements supported?",
        answer:
          "Yes. RBC business account statements are fully supported. The parser handles both the standard personal account layout and the business account format that includes additional reference number columns.",
      },
    ],
  },
  "convert-bmo-bank-statement-to-csv": {
    intro:
      "BMO (Bank of Montreal) is Canada's oldest bank, founded in 1817, and one of the Big Five. BMO serves millions of personal and commercial banking customers across Canada and the US. Their PDF statements contain detailed transaction records, but the compact table formatting makes manual extraction a chore — especially for busy months with dozens of transactions per page. BankRead reads BMO's statement layout automatically, extracting dates, descriptions, debits, credits, and balances into a structured format ready for export to CSV or Excel.",
    statementFormat:
      "BMO chequing and savings statements use a portrait PDF layout. The transaction table includes columns for Date, Description, Debits, Credits, and Balance. Transactions are listed in chronological order. The header section shows the account number, branch transit, statement period, and account summary (opening balance, total debits, total credits, closing balance). BMO Mastercard statements use a separate layout with Date, Transaction Description, and Amount columns, plus a statement summary section at the top showing previous balance, payments, purchases, and new balance.",
    downloadSteps: [
      "Log in to BMO Online Banking at bmo.com with your card number and password.",
      "Click on the account name from the accounts dashboard.",
      "Select 'Statements' from the account options or navigation menu.",
      "Choose the month you need from the list — BMO keeps eStatements for up to 7 years.",
      "Click the PDF download link and save the file to your computer.",
    ],
    extractedFields: [
      "Transaction date",
      "Description (e.g., 'INTERAC DIRECT PAYMENT — CANADIAN TIRE #327')",
      "Debit amount (withdrawals, payments, fees)",
      "Credit amount (deposits, refunds)",
      "Running balance",
      "AI-assigned category (e.g., Auto & Gas, Shopping, Utilities)",
    ],
    pdfTips: [
      "BMO statements use a clean, column-aligned table that's well-suited to automated extraction — expect high accuracy.",
      "BMO Mastercard statements are also supported. Upload credit card statements the same way as chequing statements.",
      "Multi-page statements (common for business accounts with high transaction volume) are processed in a single upload.",
      "BMO occasionally includes promotional banners or notices in the PDF — BankRead's parser ignores these and extracts only the transaction table.",
      "BMO US personal banking (formerly BMO Harris) statements have a slightly different layout — both Canadian and US BMO formats are supported.",
    ],
    commonIssues: [
      "BMO statements sometimes include an 'Interest Summary' or 'Fee Summary' section at the end. These are extracted as individual line items, not duplicated.",
      "Older BMO statements (pre-2013) may use a different font and layout. BankRead handles legacy formats but text-based PDFs yield the best results.",
      "BMO's combined statements (multiple accounts in one PDF) are supported — all accounts' transactions are extracted together.",
    ],
    faqs: [
      {
        question: "Does BankRead support BMO Mastercard statements?",
        answer:
          "Yes. BMO Mastercard credit card statements are fully supported. BankRead extracts the detailed transaction list including date, merchant name, and amount. The statement summary section is parsed separately from individual transactions to avoid duplication.",
      },
      {
        question: "Can I convert BMO US banking statements (formerly BMO Harris)?",
        answer:
          "Yes. BankRead supports both BMO Canada and BMO US (formerly BMO Harris) statement formats. The layouts differ slightly, but the AI parser handles both and extracts the same set of fields.",
      },
      {
        question: "What if my BMO statement has multiple accounts on one PDF?",
        answer:
          "BankRead extracts all transactions from the PDF regardless of how many accounts are included. Each transaction retains its date, description, and amount. You can filter or sort by description keywords to separate accounts in your spreadsheet.",
      },
    ],
  },
  "convert-scotiabank-statement-to-csv": {
    intro:
      "Scotiabank (Bank of Nova Scotia) is Canada's most international bank, operating in over 30 countries and serving millions of customers. Their PDF bank statements contain detailed transaction data for chequing, savings, and credit card accounts. For business owners, accountants, and anyone managing personal finances, having this data in CSV or Excel format is essential — whether for tax filing, expense reports, budgeting, or importing into accounting software like QuickBooks or Xero. BankRead's AI converts Scotiabank statements to structured spreadsheet data in seconds.",
    statementFormat:
      "Scotiabank chequing statements use a portrait PDF layout with transactions grouped by date. The table columns are Date, Description, Withdrawals, Deposits, and Balance. The statement header includes the account number, transit number, statement period, and account summary. Scotiabank Visa and Amex credit card statements have a different layout: they show a summary of account activity at the top, followed by a detailed transaction list with Date, Description, and Amount. Scotia Scene+ reward point activity may also appear on Visa statements.",
    downloadSteps: [
      "Sign in to Scotia OnLine at scotiabank.com with your card number and password.",
      "From the Accounts page, select the account you want to export.",
      "Click 'Statements' or 'View eStatements' in the account menu.",
      "Select the statement month — Scotiabank stores eStatements for up to 7 years.",
      "Download the PDF by clicking the statement date link or the PDF icon.",
    ],
    extractedFields: [
      "Transaction date (posted date as shown on the statement)",
      "Description / merchant name (e.g., 'POS — METRO INC MONTREAL QC')",
      "Withdrawals (debit amounts)",
      "Deposits (credit amounts)",
      "Running balance after each transaction",
      "AI-assigned category (e.g., Groceries, Transport, Entertainment)",
    ],
    pdfTips: [
      "Scotiabank statements group transactions by date — BankRead preserves this chronological order in the output.",
      "Scene+ reward transactions and interest charges are extracted as regular line items, so nothing is missed.",
      "Scotiabank Visa and Amex credit card statements have different layouts from banking statements — both are fully supported.",
      "USD account statements display amounts in US dollars. BankRead extracts the values as shown without conversion.",
      "Scotiabank's iTRADE investment account statements are not banking statements — these are not supported. Stick to chequing, savings, and credit card statements.",
    ],
    commonIssues: [
      "Scotiabank occasionally reformats their eStatement templates. If a newer statement looks different, BankRead's AI adapts to layout changes automatically.",
      "Some Scotiabank PDFs include a 'pre-authorized payment summary' — this is extracted as part of the transaction table.",
      "Scotiabank joint account statements show all transactions from all account holders. BankRead extracts everything; filter by description in your spreadsheet if needed.",
    ],
    faqs: [
      {
        question: "Are Scotiabank Visa and Amex statements both supported?",
        answer:
          "Yes. BankRead supports Scotiabank Visa, Scotiabank American Express, and Scotiabank chequing/savings statements. Each has a different PDF layout, and BankRead's AI detects the format automatically.",
      },
      {
        question: "Does BankRead extract Scene+ reward point transactions?",
        answer:
          "Scene+ point transactions that appear in the transaction list on your Scotiabank Visa statement are extracted as regular line items. BankRead captures the date, description, and amount for every transaction on the statement.",
      },
      {
        question: "Can I convert Scotiabank statements from international branches?",
        answer:
          "BankRead is optimized for Scotiabank Canada statements. Statements from Scotiabank's international branches (Caribbean, Latin America) may have different formats. Upload your PDF and BankRead will attempt extraction — results vary by country format.",
      },
    ],
  },
  "convert-cibc-bank-statement-to-csv": {
    intro:
      "CIBC (Canadian Imperial Bank of Commerce) serves over 14 million personal banking and business clients. Their PDF bank statements contain all the transaction detail needed for bookkeeping, tax preparation, and financial analysis — but getting that data out of the PDF and into a usable spreadsheet format has traditionally required manual data entry. BankRead automates the entire process: upload your CIBC statement PDF, and the AI extracts every transaction with date, description, amount, and balance, then lets you export to CSV or Excel with one click.",
    statementFormat:
      "CIBC chequing and savings statements use a portrait PDF layout with a clean tabular format. Columns include Date, Description, Debit, Credit, and Balance. The header section displays the account number, transit, statement period, and a summary showing opening balance, total debits, total credits, and closing balance. CIBC Visa statements use a different layout: they show a summary of charges, payments, and interest at the top, followed by a detailed transaction list with Transaction Date, Posting Date, Description, and Amount.",
    downloadSteps: [
      "Log in to CIBC Online Banking at cibc.com with your card number and password.",
      "Navigate to the account from your accounts overview.",
      "Click 'Statements' in the account navigation menu.",
      "Select the statement date from the list — CIBC stores up to 7 years of eStatements.",
      "Click the PDF icon or 'Download' to save the statement to your computer.",
    ],
    extractedFields: [
      "Transaction date (and posting date for Visa statements)",
      "Description (e.g., 'INTERAC E-TRANSFER FROM JOHN DOE' or 'COSTCO WHOLESALE #312')",
      "Debit amount (withdrawals, purchases, service charges)",
      "Credit amount (deposits, refunds, e-Transfers received)",
      "Balance",
      "AI-assigned category (e.g., Shopping, Income, Subscription)",
    ],
    pdfTips: [
      "CIBC's clean tabular statement format yields very high extraction accuracy — columns are well-aligned and consistent.",
      "CIBC Visa statements include both a Transaction Date and a Posting Date. BankRead extracts the Transaction Date by default.",
      "Interac e-Transfer transactions include the sender or recipient name in the description, which is fully preserved.",
      "Multi-account PDFs (e.g., chequing + savings in one statement) are supported — all transactions from all accounts in the PDF are extracted.",
      "CIBC Aventura or Aeroplan points activity on Visa statements is listed alongside financial transactions and is extracted as a regular line item.",
    ],
    commonIssues: [
      "CIBC statements may include a 'Service Charges Summary' section at the end. These charges also appear as individual transactions in the main table, so there's no duplication in the extraction.",
      "CIBC's 'Smart Account' statements include the monthly fee and rebate as separate line items — both are extracted.",
      "Older CIBC statements (pre-2014) may use a slightly different layout. BankRead supports both legacy and current formats.",
    ],
    faqs: [
      {
        question: "Does BankRead extract both Transaction Date and Posting Date from CIBC Visa statements?",
        answer:
          "BankRead extracts the Transaction Date as the primary date for each transaction. The Posting Date is included in the description field when it differs from the Transaction Date, so you have both dates available in your export.",
      },
      {
        question: "Are CIBC business banking statements supported?",
        answer:
          "Yes. CIBC business account statements follow a similar layout to personal accounts and are fully supported. Business statements may include additional reference numbers, which are captured in the description field.",
      },
      {
        question: "Can I convert CIBC mortgage or investment statements?",
        answer:
          "BankRead is optimized for CIBC chequing, savings, and Visa credit card statements. Mortgage statements and CIBC Investor's Edge statements have different formats and are not currently supported.",
      },
    ],
  },
  "convert-chase-bank-statement-to-csv": {
    intro:
      "JPMorgan Chase is the largest bank in the United States by total assets, serving over 80 million consumer households. Chase PDF bank statements are commonly needed in spreadsheet format for expense tracking, small business accounting, tax preparation, and importing into software like QuickBooks, FreshBooks, or Xero. However, Chase statements organize deposits and withdrawals into separate sections, making copy-paste into a spreadsheet unreliable. BankRead's AI parser understands Chase's statement structure and merges all transactions into a single, chronological table ready for CSV or Excel export.",
    statementFormat:
      "Chase checking statements use a portrait PDF layout that separates transactions into sections: 'Electronic Withdrawals,' 'Deposits and Additions,' and sometimes 'Checks Paid' and 'Fees.' Each section lists transactions with Date, Description, and Amount. The statement header includes the account number (partially masked), statement period, beginning balance, and ending balance. Chase credit card statements have a different layout: they show an Account Summary at the top, followed by a detail of transactions by date with Transaction Date, Post Date, Description, and Amount.",
    downloadSteps: [
      "Sign in to Chase Online at chase.com or through the Chase Mobile app.",
      "Select the account from your accounts overview.",
      "Click 'Statements & documents' in the account menu.",
      "Under 'Statements,' select the month you need — Chase stores statements for up to 7 years.",
      "Click the download/PDF icon to save the statement to your computer.",
    ],
    extractedFields: [
      "Transaction date (posted date)",
      "Description / merchant (e.g., 'AMZN Mktp US*AB1CD2EF3' or 'ZELLE PAYMENT TO JOHN')",
      "Amount (debit or credit, extracted from the correct section)",
      "Balance (beginning and ending balance from the summary)",
      "Check number (extracted from the 'Checks Paid' section when applicable)",
      "AI-assigned category (e.g., Online Shopping, Transfer, Dining)",
    ],
    pdfTips: [
      "Chase checking statements separate deposits and withdrawals into distinct sections (Electronic Withdrawals, Deposits and Additions). BankRead merges them into a single chronological transaction list.",
      "Chase credit card statements include reward points summaries and promotional APR details — these are excluded from the transaction extraction, giving you only the actual transactions.",
      "Pending transactions do not appear on PDF statements, so only posted (final) transactions are extracted.",
      "Chase Business checking and Ink credit card statements follow the same extraction process as personal accounts.",
      "Chase statements that include check images in the PDF do not affect the extraction — images are automatically skipped.",
    ],
    commonIssues: [
      "Chase's sectioned layout (withdrawals and deposits in separate tables) can cause issues with naive copy-paste approaches. BankRead handles this correctly by extracting each section and combining them chronologically.",
      "Some Chase statements include a 'Daily Ending Balance' section. This summary is not duplicated as individual transactions in the extraction.",
      "Chase Sapphire and Freedom card statements may include a 'Points Activity' section — this is excluded from the financial transaction extraction.",
    ],
    faqs: [
      {
        question: "Does BankRead combine Chase's separate withdrawal and deposit sections?",
        answer:
          "Yes. Chase checking statements list withdrawals and deposits in separate sections. BankRead extracts both sections and combines all transactions into a single chronological list, with debits and credits in separate columns in the CSV/Excel output.",
      },
      {
        question: "Are Chase credit card statements (Sapphire, Freedom, etc.) supported?",
        answer:
          "Yes. All Chase consumer and business credit card statements are supported, including Chase Sapphire, Freedom, and Ink cards. BankRead extracts the detailed transaction list with date, merchant, and amount.",
      },
      {
        question: "Can I convert Chase business checking statements?",
        answer:
          "Yes. Chase Business Complete Checking and other business account statements are fully supported. The format is similar to personal checking statements, and BankRead handles both identically.",
      },
    ],
  },
  "convert-bank-of-america-statement-to-csv": {
    intro:
      "Bank of America (BofA) is the second-largest bank in the United States, serving approximately 69 million consumer and small business clients. Their PDF bank statements are a critical source of financial data for bookkeepers, accountants, and individuals managing personal or business finances. Manually transcribing transaction data from a BofA PDF into a spreadsheet is time-consuming and invites errors — especially for accounts with dozens of transactions per month. BankRead automates the entire process, extracting every transaction from your Bank of America statement PDF and producing a clean CSV or Excel file in seconds.",
    statementFormat:
      "Bank of America checking and savings statements use a portrait PDF layout. The transaction table lists entries by date with columns for Date, Description, Amount, and Running Balance. Deposits and withdrawals appear together in chronological order. The header section shows the account number (partially masked), statement period, beginning balance, ending balance, and total deposits/withdrawals for the period. BofA credit card statements have a separate layout: a summary section at the top, followed by transactions grouped into 'Purchases,' 'Payments and Other Credits,' and 'Fees and Interest Charged,' each with Date, Description, and Amount.",
    downloadSteps: [
      "Log in to Bank of America Online Banking at bankofamerica.com or through the BofA mobile app.",
      "Navigate to the account from your accounts overview.",
      "Click 'Statements & Documents' in the account menu.",
      "Select the statement period you need — BofA stores eStatements for up to 7 years.",
      "Click 'Statement' (PDF icon) to download the file to your computer.",
    ],
    extractedFields: [
      "Transaction date (posted date as shown on the statement)",
      "Description / payee (e.g., 'PURCHASE AUTHORIZED ON 01/15 TARGET T-1234 CHICAGO IL')",
      "Amount (combined debit/credit column on checking; separate sections on credit cards)",
      "Running balance (after each transaction on checking statements)",
      "Check number (when a check clears, the number is included)",
      "AI-assigned category (e.g., Retail Shopping, Groceries, Subscription, Income)",
    ],
    pdfTips: [
      "BofA checking statements list deposits and withdrawals together in chronological order — BankRead extracts them as-is with amounts correctly signed.",
      "BofA credit card statements group transactions by type (Purchases, Payments, Fees). BankRead combines all sections into a single chronological list.",
      "Check images may be included in the PDF appendix. These image pages are automatically skipped during extraction.",
      "Multi-page statements with high transaction volumes (common for business accounts) are handled in a single upload.",
      "Bank of America's 'Online and Mobile Banking Activity' description format includes the authorization date and merchant location, which is fully captured in the extracted description.",
    ],
    commonIssues: [
      "BofA credit card statements separate purchases, payments, and fees into distinct sections. BankRead merges them chronologically so your export has a unified view.",
      "Some BofA statements include a 'Daily Balance Summary' section — this informational table is not extracted as duplicate transactions.",
      "BofA Merrill Edge investment account statements are not banking statements and may have different extraction results. Checking and savings accounts are fully supported.",
    ],
    faqs: [
      {
        question: "Does BankRead support Bank of America credit card statements?",
        answer:
          "Yes. BofA credit card statements (including Cash Rewards, Travel Rewards, and Premium Rewards) are fully supported. BankRead extracts the detailed transaction list from all sections — purchases, payments, and fees — and combines them into a single chronological export.",
      },
      {
        question: "Can I convert Bank of America business checking statements?",
        answer:
          "Yes. BofA Business Advantage checking and other business account statements are supported. They follow a similar layout to personal checking statements and BankRead extracts all transaction fields identically.",
      },
      {
        question: "Are BofA statements with check images supported?",
        answer:
          "Yes. BofA statements that include scanned check images in the appendix are handled correctly. BankRead extracts only the transaction table data and ignores the check image pages, so the images don't affect your export.",
      },
    ],
  },
  "convert-wells-fargo-statement-to-csv": {
    intro:
      "Wells Fargo is one of the 'Big Four' US banks, serving over 70 million customers. Their PDF bank statements are widely used by accountants, bookkeepers, and individuals who need transaction data in spreadsheet format for tax preparation, expense reporting, budgeting, or importing into accounting software. Wells Fargo statements separate withdrawals and deposits into distinct sections, which makes manual copy-paste into a spreadsheet error-prone. BankRead solves this by using AI to parse Wells Fargo's specific statement format, extract every transaction, and produce a clean CSV or Excel file — all in seconds.",
    statementFormat:
      "Wells Fargo checking statements use a portrait PDF with transactions organized into sections: 'Transaction History' (withdrawals/debits) and 'Deposits and Other Credits.' Each section lists transactions by date with columns for Date, Description, and Amount. A 'Daily Ending Balance' section may follow. The header includes the account number (partially masked), statement period, beginning balance, ending balance, and totals. Wells Fargo credit card statements show a summary at the top, then detailed transactions with Date, Merchant/Description, and Amount, organized by transaction type.",
    downloadSteps: [
      "Sign in to Wells Fargo Online at wellsfargo.com with your username and password.",
      "Click on the account from your accounts summary page.",
      "Select 'Statements & Documents' from the account navigation menu.",
      "Choose the statement period from the list — Wells Fargo stores up to 7 years of eStatements.",
      "Click the statement link to view, then download/save the PDF to your computer.",
    ],
    extractedFields: [
      "Transaction date (posted date)",
      "Description / merchant (e.g., 'PURCHASE AUTHORIZED ON 01/15 STARBUCKS SEATTLE WA')",
      "Withdrawals (debits extracted from the Transaction History section)",
      "Deposits (credits extracted from the Deposits section)",
      "Daily ending balance (captured from the Daily Balance section)",
      "AI-assigned category (e.g., Coffee & Cafes, Payroll, Rent, Insurance)",
    ],
    pdfTips: [
      "Wells Fargo statements clearly separate withdrawals and deposits into different sections. BankRead combines them into a unified, chronological transaction list.",
      "The 'Daily Ending Balance' section is captured separately and not duplicated as transactions in your export.",
      "Wells Fargo credit card statements (Active Cash, Reflect, Autograph) are also supported with full transaction extraction.",
      "Statements with check images included in the PDF appendix don't affect the extraction — image pages are skipped.",
      "Wells Fargo business account statements follow a similar pattern to personal accounts and are fully supported.",
    ],
    commonIssues: [
      "Wells Fargo's sectioned layout means copy-pasting from the PDF loses transaction type context. BankRead retains whether each transaction was a withdrawal or deposit in the exported data.",
      "Some Wells Fargo statements include a 'Year-to-Date Summary' section. This aggregate data is not extracted as individual transactions.",
      "Wells Fargo Portfolio statements that combine banking and investment accounts may only have the banking transactions extracted. Investment line items are not supported.",
    ],
    faqs: [
      {
        question: "Does BankRead merge Wells Fargo's separate withdrawal and deposit sections?",
        answer:
          "Yes. Wells Fargo checking statements list withdrawals and deposits in separate sections. BankRead extracts both sections and produces a unified, chronological transaction list with debits and credits in separate columns.",
      },
      {
        question: "Are Wells Fargo credit card statements supported?",
        answer:
          "Yes. All Wells Fargo consumer credit card statements are supported, including Active Cash, Reflect, Autograph, and BILT cards. BankRead extracts the detailed transaction list with date, merchant name, and amount.",
      },
      {
        question: "Can I import the exported CSV into QuickBooks?",
        answer:
          "Yes. BankRead's CSV export is compatible with QuickBooks Online and QuickBooks Desktop. The CSV includes Date, Description, and Amount columns in the format QuickBooks expects for bank transaction imports.",
      },
    ],
  },
};

/* ---------- HowTo steps (shared across all posts) ---------- */

const howToSteps = [
  {
    name: "Download your bank statement PDF",
    text: "Log in to your online banking portal and download the PDF statement for the period you need.",
  },
  {
    name: "Upload the PDF to BankRead",
    text: "Go to your BankRead dashboard and drag-and-drop (or click to upload) the PDF file.",
  },
  {
    name: "AI extracts your transactions",
    text: "BankRead's AI reads every transaction on the statement, extracting dates, descriptions, amounts, and balances.",
  },
  {
    name: "Review the extracted data",
    text: "Check the transaction table on screen to verify the data looks correct. AI categorization is applied automatically.",
  },
  {
    name: "Export to CSV or Excel",
    text: "Click the export button to download your clean, structured data as a CSV or Excel file.",
  },
];

/* ---------- page component ---------- */

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const content = bankContent[slug];
  if (!content) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: post.title,
        description: post.description,
        datePublished: post.date,
        author: { "@type": "Organization", name: "BankRead" },
        publisher: {
          "@type": "Organization",
          name: "BankRead",
          url: "https://bankread.ai",
          logo: {
            "@type": "ImageObject",
            url: "https://bankread.ai/icon.svg",
          },
        },
        mainEntityOfPage: `https://bankread.ai/blog/${post.slug}`,
      },
      {
        "@type": "HowTo",
        name: `How to convert ${post.bankName} PDF statements to CSV or Excel`,
        description: post.description,
        step: howToSteps.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.name,
          text: s.text,
        })),
        tool: {
          "@type": "HowToTool",
          name: "BankRead",
        },
        totalTime: "PT2M",
      },
      {
        "@type": "FAQPage",
        mainEntity: content.faqs.map((faq) => ({
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
    <div className="min-h-screen flex flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
              <rect x="4" y="2" width="24" height="28" rx="3" fill="#2563eb"/>
              <rect x="7" y="5" width="18" height="22" rx="1.5" fill="#fff"/>
              <text x="16" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#2563eb">$</text>
              <rect x="9" y="7" width="14" height="2" rx="1" fill="#93c5fd"/>
            </svg>
            <span className="text-xl font-bold text-gray-900">BankRead</span>
          </Link>
          <Link
            href="/blog"
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            &larr; All posts
          </Link>
        </div>
      </nav>

      {/* Article */}
      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 w-full">
        <article>
          <header className="mb-10">
            <p className="text-sm text-gray-500 mb-3">
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              &middot; {post.readingTime}
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              {post.description}
            </p>
          </header>

          <div className="space-y-10 text-gray-700 leading-relaxed text-[15px]">
            {/* Introduction */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Why Convert {post.bankName} Statements?
              </h2>
              <p>{content.intro}</p>
            </section>

            {/* Statement format */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Understanding the {post.bankName} Statement Format
              </h2>
              <p>{content.statementFormat}</p>
            </section>

            {/* Step-by-step with BankRead */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                How to Convert with BankRead
              </h2>
              <p className="mb-4">
                Follow these steps to convert your {post.bankName} PDF statement
                to CSV or Excel:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Download your statement</strong> — Get the PDF from
                  your {post.bankName} online banking portal (see steps below).
                </li>
                <li>
                  <strong>Upload to BankRead</strong> — Drag and drop (or click
                  to upload) the PDF on your BankRead dashboard.
                </li>
                <li>
                  <strong>AI processes your statement</strong> — BankRead&apos;s
                  AI reads every transaction, extracting dates, descriptions,
                  and amounts automatically.
                </li>
                <li>
                  <strong>Review the extracted data</strong> — Check the
                  transaction table to verify everything is correct. AI
                  categorization is applied automatically.
                </li>
                <li>
                  <strong>Export to CSV or Excel</strong> — Click the export
                  button to download your data in your preferred format.
                </li>
              </ol>
            </section>

            {/* Downloading the statement */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                How to Download Your {post.bankName} Statement PDF
              </h2>
              <ol className="list-decimal pl-5 space-y-2">
                {content.downloadSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </section>

            {/* Extracted data fields */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                What Data Gets Extracted
              </h2>
              <p className="mb-4">
                BankRead extracts the following fields from your {post.bankName}{" "}
                statement:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                {content.extractedFields.map((field, i) => (
                  <li key={i}>{field}</li>
                ))}
              </ul>
            </section>

            {/* Export options */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Export Options
              </h2>
              <p className="mb-4">
                Once your {post.bankName} statement is processed, you can export
                the data in two formats:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>CSV (Comma-Separated Values)</strong> — Ideal for
                  importing into accounting software like QuickBooks, Xero,
                  Wave, or FreshBooks. Compatible with virtually any spreadsheet
                  application including Google Sheets.
                </li>
                <li>
                  <strong>Excel (.xlsx)</strong> — Ready-made spreadsheet with
                  formatted columns and headers. Great for custom analysis,
                  pivot tables, VLOOKUP formulas, or sharing with your
                  accountant.
                </li>
              </ul>
            </section>

            {/* Bank-specific tips */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Tips for {post.bankName} Statements
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                {content.pdfTips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
            </section>

            {/* Common issues */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Common Issues and Solutions
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                {content.commonIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </section>

            {/* FAQ */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {content.faqs.map((faq, i) => (
                  <div key={i}>
                    <h3 className="text-base font-semibold text-gray-900 mb-2">
                      {faq.question}
                    </h3>
                    <p>{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <section className="bg-blue-50 rounded-2xl p-8 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                Ready to Convert Your {post.bankName} Statement?
              </h2>
              <p className="text-gray-600 mb-6">
                Upload your PDF and get clean CSV or Excel data in seconds. No
                manual data entry required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Get Started Free
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </section>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true">
                <rect x="4" y="2" width="24" height="28" rx="3" fill="#2563eb"/>
                <rect x="7" y="5" width="18" height="22" rx="1.5" fill="#fff"/>
                <text x="16" y="21" textAnchor="middle" fontFamily="Arial,sans-serif" fontWeight="bold" fontSize="14" fill="#2563eb">$</text>
                <rect x="9" y="7" width="14" height="2" rx="1" fill="#93c5fd"/>
              </svg>
              <span className="text-white font-semibold">BankRead</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} BankRead. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
