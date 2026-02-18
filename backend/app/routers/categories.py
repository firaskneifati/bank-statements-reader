import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.auth.dependencies import CurrentUser
from app.db.engine import get_session
from app.db.models import CategoryGroup, Category, CategoryRule
from app.lib.defaults import DEFAULT_CATEGORIES
from app.models.transaction import Transaction
from app.services.rule_engine import apply_rules

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────

class CategoryGroupCreate(BaseModel):
    name: str


class CategoryGroupUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class RuleCreate(BaseModel):
    rule_type: str  # "include" or "exclude"
    pattern: str


class RuleUpdate(BaseModel):
    rule_type: str | None = None
    pattern: str | None = None


class RuleOut(BaseModel):
    id: str
    rule_type: str
    pattern: str
    created_at: datetime


class CategoryOut(BaseModel):
    id: str
    name: str
    description: str | None
    sort_order: int
    rules: list[RuleOut]


class CategoryGroupOut(BaseModel):
    id: str
    name: str
    is_active: bool
    categories: list[CategoryOut]
    created_at: datetime
    updated_at: datetime


class SimilarityWarning(BaseModel):
    message: str
    conflicting_name: str | None = None
    conflicting_pattern: str | None = None


# ── Helpers ──────────────────────────────────────────────────────────

def _levenshtein(a: str, b: str) -> int:
    if len(a) < len(b):
        return _levenshtein(b, a)
    if len(b) == 0:
        return len(a)
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (ca != cb)))
        prev = curr
    return prev[-1]


def _check_name_similarity(new_name: str, existing_names: list[str]) -> SimilarityWarning | None:
    lower = new_name.strip().lower()
    for name in existing_names:
        existing_lower = name.lower()
        if lower == existing_lower:
            raise HTTPException(status_code=409, detail=f"Category '{name}' already exists")
        if _levenshtein(lower, existing_lower) <= 2:
            return SimilarityWarning(
                message=f"Very similar to existing category '{name}'",
                conflicting_name=name,
            )
    return None


def _check_rule_conflicts(
    pattern: str,
    rule_type: str,
    category_id: uuid.UUID,
    all_categories: list[Category],
) -> SimilarityWarning | None:
    lower = pattern.strip().lower()
    for cat in all_categories:
        for rule in cat.rules:
            existing_lower = rule.pattern.lower()
            # Exact duplicate in same category
            if rule.category_id == category_id and lower == existing_lower:
                raise HTTPException(status_code=409, detail=f"Rule with pattern '{rule.pattern}' already exists")
            # Substring overlap
            if lower in existing_lower or existing_lower in lower:
                return SimilarityWarning(
                    message=f"Pattern overlaps with rule '{rule.pattern}' on category '{cat.name}'",
                    conflicting_pattern=rule.pattern,
                    conflicting_name=cat.name,
                )
            if _levenshtein(lower, existing_lower) <= 2:
                return SimilarityWarning(
                    message=f"Very similar to rule '{rule.pattern}' on category '{cat.name}'",
                    conflicting_pattern=rule.pattern,
                    conflicting_name=cat.name,
                )
    return None


def _group_to_out(group: CategoryGroup) -> CategoryGroupOut:
    return CategoryGroupOut(
        id=str(group.id),
        name=group.name,
        is_active=group.is_active,
        created_at=group.created_at,
        updated_at=group.updated_at,
        categories=[
            CategoryOut(
                id=str(cat.id),
                name=cat.name,
                description=cat.description,
                sort_order=cat.sort_order,
                rules=[
                    RuleOut(
                        id=str(r.id),
                        rule_type=r.rule_type,
                        pattern=r.pattern,
                        created_at=r.created_at,
                    )
                    for r in cat.rules
                ],
            )
            for cat in sorted(group.categories, key=lambda c: c.sort_order)
        ],
    )


async def _load_group(
    group_id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession,
) -> CategoryGroup:
    result = await session.execute(
        select(CategoryGroup)
        .where(CategoryGroup.id == group_id, CategoryGroup.user_id == user_id)
        .options(
            selectinload(CategoryGroup.categories).selectinload(Category.rules)
        )
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Category group not found")
    return group


# ── Category Groups ──────────────────────────────────────────────────

@router.get("/category-groups", response_model=list[CategoryGroupOut])
async def list_groups(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(CategoryGroup)
        .where(CategoryGroup.user_id == current_user.id)
        .options(
            selectinload(CategoryGroup.categories).selectinload(Category.rules)
        )
        .order_by(CategoryGroup.created_at)
    )
    groups = list(result.scalars().all())

    # Auto-create a "Default" group on first access
    if not groups:
        group = CategoryGroup(
            user_id=current_user.id,
            name="Default",
            is_active=True,
        )
        session.add(group)
        await session.flush()
        for i, cat_def in enumerate(DEFAULT_CATEGORIES):
            session.add(Category(
                group_id=group.id,
                name=cat_def["name"],
                description=cat_def.get("description"),
                sort_order=i,
            ))
        await session.commit()
        # Reload with relationships
        result = await session.execute(
            select(CategoryGroup)
            .where(CategoryGroup.id == group.id)
            .options(
                selectinload(CategoryGroup.categories).selectinload(Category.rules)
            )
        )
        groups = list(result.scalars().all())

    return [_group_to_out(g) for g in groups]


@router.post("/category-groups", response_model=CategoryGroupOut, status_code=201)
async def create_group(
    body: CategoryGroupCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Group name is required")

    # Check duplicate group name
    existing = await session.execute(
        select(CategoryGroup).where(
            CategoryGroup.user_id == current_user.id,
            CategoryGroup.name == name,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Group '{name}' already exists")

    # Check if user has any groups (first group becomes active)
    count_result = await session.execute(
        select(CategoryGroup).where(CategoryGroup.user_id == current_user.id)
    )
    is_first = not count_result.scalars().first()

    group = CategoryGroup(
        user_id=current_user.id,
        name=name,
        is_active=is_first,
    )
    session.add(group)
    await session.flush()

    # Populate with default categories
    for i, cat_def in enumerate(DEFAULT_CATEGORIES):
        cat = Category(
            group_id=group.id,
            name=cat_def["name"],
            description=cat_def.get("description"),
            sort_order=i,
        )
        session.add(cat)

    await session.commit()

    return _group_to_out(await _load_group(group.id, current_user.id, session))


@router.patch("/category-groups/{group_id}", response_model=CategoryGroupOut)
async def update_group(
    group_id: uuid.UUID,
    body: CategoryGroupUpdate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    group = await _load_group(group_id, current_user.id, session)

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Group name is required")
        # Check duplicate
        existing = await session.execute(
            select(CategoryGroup).where(
                CategoryGroup.user_id == current_user.id,
                CategoryGroup.name == name,
                CategoryGroup.id != group_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail=f"Group '{name}' already exists")
        group.name = name

    if body.is_active is True:
        # Deactivate all other groups
        all_groups = await session.execute(
            select(CategoryGroup).where(CategoryGroup.user_id == current_user.id)
        )
        for g in all_groups.scalars().all():
            g.is_active = (g.id == group_id)
            session.add(g)

    group.updated_at = datetime.utcnow()
    session.add(group)
    await session.commit()

    return _group_to_out(await _load_group(group.id, current_user.id, session))


@router.delete("/category-groups/{group_id}", status_code=204)
async def delete_group(
    group_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    group = await _load_group(group_id, current_user.id, session)
    was_active = group.is_active
    await session.delete(group)
    await session.commit()

    # If deleted group was active, activate the first remaining group
    if was_active:
        remaining = await session.execute(
            select(CategoryGroup)
            .where(CategoryGroup.user_id == current_user.id)
            .order_by(CategoryGroup.created_at)
            .limit(1)
        )
        first = remaining.scalar_one_or_none()
        if first:
            first.is_active = True
            session.add(first)
            await session.commit()


# ── Categories ───────────────────────────────────────────────────────

class CategoryCreateResponse(BaseModel):
    category: CategoryOut
    warning: SimilarityWarning | None = None


@router.post(
    "/category-groups/{group_id}/categories",
    response_model=CategoryCreateResponse,
    status_code=201,
)
async def add_category(
    group_id: uuid.UUID,
    body: CategoryCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    group = await _load_group(group_id, current_user.id, session)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Category name is required")

    existing_names = [c.name for c in group.categories]
    warning = _check_name_similarity(name, existing_names)

    max_order = max((c.sort_order for c in group.categories), default=-1)
    cat = Category(
        group_id=group.id,
        name=name,
        description=body.description,
        sort_order=max_order + 1,
    )
    session.add(cat)
    await session.commit()
    await session.refresh(cat)

    return CategoryCreateResponse(
        category=CategoryOut(
            id=str(cat.id),
            name=cat.name,
            description=cat.description,
            sort_order=cat.sort_order,
            rules=[],
        ),
        warning=warning,
    )


@router.patch("/categories/{category_id}", response_model=CategoryCreateResponse)
async def update_category(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    # Load the category and verify ownership
    result = await session.execute(
        select(Category)
        .where(Category.id == category_id)
        .options(selectinload(Category.group), selectinload(Category.rules))
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    group = await _load_group(cat.group_id, current_user.id, session)

    warning = None
    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Category name is required")
        if name.lower() == "other" and cat.name.lower() != "other":
            raise HTTPException(status_code=400, detail="Cannot rename to 'Other' — it's reserved")
        existing_names = [c.name for c in group.categories if c.id != category_id]
        warning = _check_name_similarity(name, existing_names)
        cat.name = name

    if body.description is not None:
        cat.description = body.description

    session.add(cat)
    await session.commit()
    await session.refresh(cat)

    return CategoryCreateResponse(
        category=CategoryOut(
            id=str(cat.id),
            name=cat.name,
            description=cat.description,
            sort_order=cat.sort_order,
            rules=[
                RuleOut(id=str(r.id), rule_type=r.rule_type, pattern=r.pattern, created_at=r.created_at)
                for r in cat.rules
            ],
        ),
        warning=warning,
    )


@router.delete("/categories/{category_id}", status_code=204)
async def delete_category(
    category_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Category).where(Category.id == category_id).options(selectinload(Category.group))
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    # Verify ownership
    await _load_group(cat.group_id, current_user.id, session)

    if cat.name.lower() == "other":
        raise HTTPException(status_code=400, detail="Cannot delete the 'Other' category")

    await session.delete(cat)
    await session.commit()


# ── Rules ────────────────────────────────────────────────────────────

class RuleCreateResponse(BaseModel):
    rule: RuleOut
    warning: SimilarityWarning | None = None


@router.post(
    "/categories/{category_id}/rules",
    response_model=RuleCreateResponse,
    status_code=201,
)
async def add_rule(
    category_id: uuid.UUID,
    body: RuleCreate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    if body.rule_type not in ("include", "exclude"):
        raise HTTPException(status_code=400, detail="rule_type must be 'include' or 'exclude'")

    pattern = body.pattern.strip()
    if not pattern:
        raise HTTPException(status_code=400, detail="Pattern is required")

    # Load category and verify ownership
    result = await session.execute(
        select(Category).where(Category.id == category_id).options(selectinload(Category.group))
    )
    cat = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")

    group = await _load_group(cat.group_id, current_user.id, session)

    warning = _check_rule_conflicts(pattern, body.rule_type, category_id, group.categories)

    rule = CategoryRule(
        category_id=category_id,
        rule_type=body.rule_type,
        pattern=pattern,
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)

    return RuleCreateResponse(
        rule=RuleOut(
            id=str(rule.id),
            rule_type=rule.rule_type,
            pattern=rule.pattern,
            created_at=rule.created_at,
        ),
        warning=warning,
    )


@router.patch("/rules/{rule_id}", response_model=RuleCreateResponse)
async def update_rule(
    rule_id: uuid.UUID,
    body: RuleUpdate,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(CategoryRule)
        .where(CategoryRule.id == rule_id)
        .options(selectinload(CategoryRule.category).selectinload(Category.group))
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    group = await _load_group(rule.category.group_id, current_user.id, session)

    warning = None
    if body.pattern is not None:
        pattern = body.pattern.strip()
        if not pattern:
            raise HTTPException(status_code=400, detail="Pattern is required")
        warning = _check_rule_conflicts(pattern, body.rule_type or rule.rule_type, rule.category_id, group.categories)
        rule.pattern = pattern

    if body.rule_type is not None:
        if body.rule_type not in ("include", "exclude"):
            raise HTTPException(status_code=400, detail="rule_type must be 'include' or 'exclude'")
        rule.rule_type = body.rule_type

    session.add(rule)
    await session.commit()
    await session.refresh(rule)

    return RuleCreateResponse(
        rule=RuleOut(
            id=str(rule.id),
            rule_type=rule.rule_type,
            pattern=rule.pattern,
            created_at=rule.created_at,
        ),
        warning=warning,
    )


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: uuid.UUID,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(CategoryRule)
        .where(CategoryRule.id == rule_id)
        .options(selectinload(CategoryRule.category).selectinload(Category.group))
    )
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Verify ownership
    await _load_group(rule.category.group_id, current_user.id, session)

    await session.delete(rule)
    await session.commit()


# ── Apply Rules ─────────────────────────────────────────────────────

class ApplyRulesRequest(BaseModel):
    transactions: list[Transaction]


class ApplyRulesResponse(BaseModel):
    transactions: list[Transaction]
    rules_applied: int


@router.post(
    "/category-groups/{group_id}/apply-rules",
    response_model=ApplyRulesResponse,
)
async def reprocess_rules(
    group_id: uuid.UUID,
    body: ApplyRulesRequest,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
):
    """Re-apply all category rules from a group to a list of transactions."""
    group = await _load_group(group_id, current_user.id, session)

    updated = apply_rules(body.transactions, group.categories, reprocess=True)
    rules_applied = sum(1 for tx in updated if tx.category_source == "rule")

    return ApplyRulesResponse(transactions=updated, rules_applied=rules_applied)
