"""Rule engine: applies include/exclude rules to override AI-assigned categories."""

import logging

from app.db.models import Category
from app.models.transaction import Transaction

logger = logging.getLogger(__name__)


def apply_rules(
    transactions: list[Transaction],
    categories: list[Category],
    reprocess: bool = False,
) -> list[Transaction]:
    """Apply category rules as post-processing overrides on AI-categorized transactions.

    For each transaction:
    1. Iterate categories by sort_order
    2. If any exclude rule matches the description → skip this category
    3. If any include rule matches → override AI category, mark source as "rule"
    4. First match wins
    5. If no rule matches → keep existing category/source unchanged

    When reprocess=True, skip transactions marked as "manual".
    """
    # Pre-sort categories by sort_order
    sorted_cats = sorted(categories, key=lambda c: c.sort_order)

    for tx in transactions:
        # During reprocessing, never touch manually-set categories
        if reprocess and tx.category_source == "manual":
            continue

        desc_lower = tx.description.lower()

        for cat in sorted_cats:
            if not cat.rules:
                continue

            # Check exclude rules first
            excluded = any(
                rule.pattern.lower() in desc_lower
                for rule in cat.rules
                if rule.rule_type == "exclude"
            )
            if excluded:
                continue

            # Check include rules
            included = any(
                rule.pattern.lower() in desc_lower
                for rule in cat.rules
                if rule.rule_type == "include"
            )
            if included:
                logger.debug(
                    "Rule match: '%s' → '%s' (was '%s')",
                    tx.description[:50], cat.name, tx.category,
                )
                tx.category = cat.name
                tx.category_source = "rule"
                break

    return transactions
