import asyncio
import random
from datetime import datetime, timedelta

from app.models.transaction import Transaction

MOCK_MERCHANTS = {
    "Payroll & Income": [
        ("PAYROLL - ACME CORP", 2800.00, 3500.00),
        ("E-TRANSFER FROM JOHN D", 150.00, 500.00),
        ("GOVERNMENT OF CANADA", 350.00, 650.00),
    ],
    "Rent & Mortgage": [
        ("RENT PAYMENT - 123 MAIN ST", 1200.00, 2200.00),
        ("TD MORTGAGE PAYMENT", 1500.00, 2500.00),
    ],
    "Utilities": [
        ("TORONTO HYDRO", 80.00, 180.00),
        ("ENBRIDGE GAS", 60.00, 150.00),
        ("ROGERS COMMUNICATIONS", 75.00, 130.00),
        ("BELL CANADA", 65.00, 120.00),
    ],
    "Groceries": [
        ("LOBLAWS #1234", 45.00, 180.00),
        ("METRO INC", 30.00, 120.00),
        ("SHOPPERS DRUG MART", 15.00, 85.00),
        ("COSTCO WHOLESALE", 100.00, 350.00),
        ("NO FRILLS #567", 25.00, 95.00),
        ("WALMART SUPERCENTRE", 40.00, 200.00),
    ],
    "Dining": [
        ("TIM HORTONS #8901", 3.50, 15.00),
        ("MCDONALDS #2345", 8.00, 22.00),
        ("STARBUCKS #6789", 5.00, 12.00),
        ("UBER EATS", 20.00, 55.00),
        ("SKIP THE DISHES", 18.00, 50.00),
        ("SWISS CHALET", 25.00, 60.00),
    ],
    "Transportation": [
        ("PRESTO TRANSIT", 3.35, 156.00),
        ("PETRO CANADA", 40.00, 95.00),
        ("SHELL GAS STATION", 45.00, 100.00),
        ("UBER TRIP", 10.00, 45.00),
        ("PARKING - IMPARK", 8.00, 25.00),
    ],
    "Insurance": [
        ("SUNLIFE INSURANCE", 120.00, 250.00),
        ("INTACT INSURANCE", 150.00, 300.00),
    ],
    "Subscriptions": [
        ("NETFLIX.COM", 16.49, 22.99),
        ("SPOTIFY CANADA", 10.99, 16.99),
        ("AMAZON PRIME", 9.99, 9.99),
        ("ADOBE SYSTEMS", 29.99, 69.99),
    ],
    "E-Transfer": [
        ("INTERAC E-TRANSFER TO SARAH M", 50.00, 300.00),
        ("INTERAC E-TRANSFER TO MIKE R", 25.00, 200.00),
    ],
    "Bank Fees": [
        ("MONTHLY ACCOUNT FEE", 4.95, 16.95),
        ("OVERDRAFT FEE", 5.00, 5.00),
    ],
}


async def generate_mock_transactions(
    filename: str,
    custom_categories: list[dict] | None = None,
) -> list[Transaction]:
    # Artificial delay to simulate processing
    await asyncio.sleep(random.uniform(0.5, 1.5))

    transactions: list[Transaction] = []
    num_transactions = random.randint(20, 40)

    # Start from roughly a month ago
    start_date = datetime.now() - timedelta(days=30)
    balance = round(random.uniform(2000.00, 8000.00), 2)

    # If custom categories provided, use those category names for random assignment
    custom_category_names: list[str] | None = None
    if custom_categories:
        custom_category_names = [c.get("name", "Other") for c in custom_categories]

    for i in range(num_transactions):
        # Advance date by 0-2 days
        start_date += timedelta(days=random.randint(0, 2))
        date_str = start_date.strftime("%Y-%m-%d")

        # Pick a random category and merchant
        category = random.choice(list(MOCK_MERCHANTS.keys()))
        merchant_name, min_amount, max_amount = random.choice(
            MOCK_MERCHANTS[category]
        )

        amount = round(random.uniform(min_amount, max_amount), 2)

        # Income categories are credits, rest are debits
        if category in ("Payroll & Income",):
            tx_type = "credit"
            balance = round(balance + amount, 2)
        elif category == "E-Transfer" and "FROM" in merchant_name:
            tx_type = "credit"
            balance = round(balance + amount, 2)
        else:
            tx_type = "debit"
            balance = round(balance - amount, 2)
            # Don't let balance go too negative
            if balance < -500:
                balance = round(random.uniform(500, 2000), 2)

        # Simulate posting date (1-3 days after transaction date) for ~50% of transactions
        posting_date = None
        if random.random() > 0.5:
            posting_dt = start_date + timedelta(days=random.randint(1, 3))
            posting_date = posting_dt.strftime("%Y-%m-%d")

        # Override category with a random custom category if provided
        if custom_category_names:
            category = random.choice(custom_category_names)

        transactions.append(
            Transaction(
                date=date_str,
                posting_date=posting_date,
                description=merchant_name,
                amount=amount,
                type=tx_type,
                balance=balance,
                category=category,
            )
        )

    return transactions
