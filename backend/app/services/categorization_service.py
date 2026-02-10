from app.models.transaction import Transaction

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Payroll & Income": [
        "payroll", "salary", "direct deposit", "government of canada",
        "e-transfer from", "etransfer from",
    ],
    "Rent & Mortgage": [
        "rent", "mortgage", "landlord", "property",
    ],
    "Utilities": [
        "hydro", "enbridge", "gas bill", "rogers", "bell canada",
        "telus", "fido", "koodo", "virgin mobile", "internet", "electric",
    ],
    "Groceries": [
        "loblaws", "metro", "shoppers", "costco", "no frills", "walmart",
        "sobeys", "food basics", "freshco", "farm boy", "whole foods",
        "longos", "t&t", "superstore",
    ],
    "Dining": [
        "tim hortons", "mcdonalds", "starbucks", "uber eats",
        "skip the dishes", "doordash", "swiss chalet", "restaurant",
        "pizza", "subway", "wendys", "burger king", "a&w",
    ],
    "Transportation": [
        "presto", "transit", "petro", "shell", "esso", "uber trip",
        "lyft", "parking", "impark", "gas station", "canadian tire gas",
    ],
    "Insurance": [
        "insurance", "sunlife", "manulife", "intact", "desjardins",
        "great-west", "canada life",
    ],
    "Subscriptions": [
        "netflix", "spotify", "amazon prime", "disney+", "apple.com",
        "adobe", "microsoft", "youtube premium", "crave",
    ],
    "E-Transfer": [
        "interac e-transfer", "etransfer", "e-transfer to",
    ],
    "Bank Fees": [
        "monthly fee", "account fee", "overdraft", "nsf fee",
        "service charge", "atm fee",
    ],
}


def categorize_transactions(transactions: list[Transaction]) -> list[Transaction]:
    for tx in transactions:
        if tx.category != "Other":
            continue
        tx.category = _categorize_single(tx.description)
    return transactions


def _categorize_single(description: str) -> str:
    desc_lower = description.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in desc_lower:
                return category
    return "Other"
