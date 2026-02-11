import json
from app.config import settings
from app.models.transaction import Transaction
from app.services.mock_service import generate_mock_transactions

PARSE_PROMPT_TEMPLATE = """You are a bank statement parser. Extract all transactions from the following bank statement text.

Return a JSON array of transactions. Each transaction should have:
- "date": string in YYYY-MM-DD format (the transaction date)
- "posting_date": string in YYYY-MM-DD format or null (the posting date, if available — credit card statements often show both a transaction date and a posting date)
- "description": string (merchant/payee name, cleaned up)
- "amount": number (always positive)
- "type": "debit" or "credit"
- "balance": number or null (running balance if available)
- "category": string — classify each transaction into exactly one of these categories:
{categories}

Use your best judgment based on the merchant name, description, and context. For bank transfers (e.g. "Online Banking transfer"), try to infer the purpose from any additional context. If a transfer description is generic with no clues, use "Transfers".

For credit card statements: "date" is the transaction date (when the purchase was made) and "posting_date" is the posting date (when it appeared on the account). If only one date is shown, use it as "date" and set "posting_date" to null.

Return ONLY the JSON array, no other text.

Bank statement text:
{text}"""


def _build_category_block(custom_categories: list[dict] | None) -> str:
    if custom_categories:
        lines = []
        for cat in custom_categories:
            name = cat.get("name", "")
            desc = cat.get("description", "")
            if name == "Other":
                continue
            if desc:
                lines.append(f'  - "{name}" — {desc}')
            else:
                lines.append(f'  - "{name}"')
        lines.append('  - "Other" — anything that doesn\'t fit the above categories')
        return "\n".join(lines)
    # Default categories
    return """  - "Payroll & Income" — salary, wages, direct deposits, government payments, tax refunds
  - "Rent & Mortgage" — rent payments, mortgage payments, property-related
  - "Utilities" — hydro, gas, electric, internet, phone, cable
  - "Groceries" — supermarkets, grocery stores, food shopping
  - "Dining" — restaurants, fast food, coffee shops, food delivery
  - "Transportation" — transit, gas stations, parking, ride-sharing, car payments
  - "Insurance" — any insurance premiums
  - "Subscriptions" — streaming, software, memberships, recurring digital services
  - "E-Transfer" — Interac e-transfers (sent or received)
  - "Bank Fees" — account fees, service charges, overdraft fees, interest charges
  - "Shopping" — retail stores, online shopping, Amazon, clothing
  - "Health & Wellness" — pharmacy, dental, medical, gym, fitness
  - "Entertainment" — movies, concerts, sports, hobbies, gaming
  - "Business Expense" — office supplies, software, professional services, business transfers
  - "Transfers" — transfers between own accounts, bill payments, loan payments
  - "Other" — only if none of the above fit"""


async def parse_transactions(
    text: str,
    filename: str,
    custom_categories: list[dict] | None = None,
) -> list[Transaction]:
    if settings.mock_mode:
        return await generate_mock_transactions(filename, custom_categories=custom_categories)

    return await _parse_with_claude(text, custom_categories=custom_categories)


async def _parse_with_claude(
    text: str,
    custom_categories: list[dict] | None = None,
) -> list[Transaction]:
    import anthropic

    category_block = _build_category_block(custom_categories)
    prompt = PARSE_PROMPT_TEMPLATE.format(categories=category_block, text=text[:15000])

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    message = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=16384,
        messages=[
            {"role": "user", "content": prompt}
        ],
    )

    response_text = message.content[0].text
    # Extract JSON from response (handle markdown code blocks)
    if "```" in response_text:
        start = response_text.index("```") + 3
        if response_text[start:].startswith("json"):
            start += 4
        # Find closing backticks, fall back to end of string
        rest = response_text[start:]
        end_idx = rest.find("```")
        response_text = rest[:end_idx].strip() if end_idx != -1 else rest.strip()

    data = json.loads(response_text)
    return [Transaction(**t) for t in data]
