#!/usr/bin/env python3
"""CLI management tool for creating users and viewing usage."""

import argparse
import asyncio
import sys

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.db.engine import async_session_factory
from app.db.models import Organization, User, Upload, ExportLog, AuditLog, Client, CategoryTemplate
from app.auth.password import hash_password


async def create_user(email: str, password: str, full_name: str, org_name: str | None, page_limit: int | None):
    if not async_session_factory:
        print("Error: DATABASE_URL not configured")
        sys.exit(1)

    async with async_session_factory() as session:
        existing = await session.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            print(f"Error: {email} already exists")
            sys.exit(1)

        org = Organization(name=org_name or f"{full_name}'s Organization", page_limit=page_limit)
        session.add(org)
        await session.flush()

        user = User(
            email=email,
            password_hash=hash_password(password),
            auth_provider="credentials",
            full_name=full_name,
            role="owner",
            org_id=org.id,
        )
        session.add(user)
        await session.commit()
        limit_str = f", page limit: {page_limit}" if page_limit else ""
        print(f"Created user: {email} ({full_name}{limit_str})")


async def set_limit(email: str, page_limit: int | None):
    if not async_session_factory:
        print("Error: DATABASE_URL not configured")
        sys.exit(1)

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"Error: {email} not found")
            sys.exit(1)

        org = await session.get(Organization, user.org_id)
        if org.stripe_subscription_id:
            print(f"Warning: {email}'s org has an active Stripe subscription (plan: {org.plan})")
            print("  Manual limit override — Stripe webhook may overwrite this on next sync.")
        org.page_limit = page_limit
        session.add(org)
        await session.commit()
        limit_str = str(page_limit) if page_limit else "unlimited"
        print(f"Set page limit for {email}: {limit_str}")


async def delete_user(email: str):
    if not async_session_factory:
        print("Error: DATABASE_URL not configured")
        sys.exit(1)

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"Error: {email} not found")
            sys.exit(1)

        uid, oid = user.id, user.org_id

        # Delete child rows referencing user
        await session.execute(AuditLog.__table__.delete().where(AuditLog.user_id == uid))
        await session.execute(ExportLog.__table__.delete().where(ExportLog.user_id == uid))
        await session.execute(Upload.__table__.delete().where(Upload.uploaded_by_user_id == uid))
        await session.execute(User.__table__.delete().where(User.id == uid))

        # Delete org if no other users remain
        remaining = await session.execute(select(func.count(User.id)).where(User.org_id == oid))
        if remaining.scalar() == 0:
            await session.execute(AuditLog.__table__.delete().where(AuditLog.org_id == oid))
            await session.execute(CategoryTemplate.__table__.delete().where(CategoryTemplate.org_id == oid))
            await session.execute(Client.__table__.delete().where(Client.org_id == oid))
            await session.execute(Organization.__table__.delete().where(Organization.id == oid))

        await session.commit()
        print(f"Deleted user: {email}")


async def grant_pages(email: str, pages: int):
    if not async_session_factory:
        print("Error: DATABASE_URL not configured")
        sys.exit(1)

    async with async_session_factory() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if not user:
            print(f"Error: {email} not found")
            sys.exit(1)

        org = await session.get(Organization, user.org_id)
        org.bonus_pages += pages
        session.add(org)
        await session.commit()
        print(f"Granted {pages} bonus pages to {email} (total bonus: {org.bonus_pages})")


async def show_usage():
    if not async_session_factory:
        print("Error: DATABASE_URL not configured")
        sys.exit(1)

    async with async_session_factory() as session:
        # Users
        users_result = await session.execute(
            select(User.id, User.email, User.full_name, User.created_at).order_by(User.created_at)
        )
        users = users_result.all()

        print(f"\n{'=' * 60}")
        print(f"  USERS ({len(users)})")
        print(f"{'=' * 60}")
        for uid, email, name, created in users:
            # Per-user upload stats
            stats = await session.execute(
                select(
                    func.count(Upload.id),
                    func.coalesce(func.sum(Upload.document_count), 0),
                    func.coalesce(func.sum(Upload.page_count), 0),
                    func.coalesce(func.sum(Upload.transaction_count), 0),
                ).where(Upload.uploaded_by_user_id == uid)
            )
            uploads, docs, pages, txns = stats.one()

            exports_result = await session.execute(
                select(func.count(ExportLog.id)).where(ExportLog.user_id == uid)
            )
            exports = exports_result.scalar() or 0

            # Get org page limit
            user_result = await session.execute(select(User).where(User.id == uid))
            user_obj = user_result.scalar_one()
            org = await session.get(Organization, user_obj.org_id)
            limit_str = f"  |  Limit: {org.page_limit} pages" if org and org.page_limit else ""
            if org and org.bonus_pages > 0:
                limit_str += f" (+{org.bonus_pages} bonus)"

            print(f"\n  {name} <{email}>")
            print(f"    Joined: {created.strftime('%Y-%m-%d')}")
            print(f"    Uploads: {uploads}  |  Documents: {docs}  |  Pages: {pages}  |  Transactions: {txns}  |  Exports: {exports}{limit_str}")

        # Totals
        totals = await session.execute(
            select(
                func.count(Upload.id),
                func.coalesce(func.sum(Upload.document_count), 0),
                func.coalesce(func.sum(Upload.page_count), 0),
                func.coalesce(func.sum(Upload.transaction_count), 0),
                func.coalesce(func.sum(Upload.bytes_processed), 0),
            )
        )
        t_uploads, t_docs, t_pages, t_txns, t_bytes = totals.one()
        t_exports_result = await session.execute(select(func.count(ExportLog.id)))
        t_exports = t_exports_result.scalar() or 0

        print(f"\n{'=' * 60}")
        print(f"  TOTALS")
        print(f"{'=' * 60}")
        print(f"  Uploads: {t_uploads}  |  Documents: {t_docs}  |  Pages: {t_pages}")
        print(f"  Transactions: {t_txns}  |  Exports: {t_exports}  |  Data: {t_bytes / 1024 / 1024:.1f} MB")
        print()


def main():
    parser = argparse.ArgumentParser(description="Bank Statement Reader management CLI")
    sub = parser.add_subparsers(dest="command")

    # create-user
    cu = sub.add_parser("create-user", help="Create a new user account")
    cu.add_argument("--email", required=True)
    cu.add_argument("--password", required=True)
    cu.add_argument("--name", required=True, help="Full name")
    cu.add_argument("--org", default=None, help="Organization name (optional)")
    cu.add_argument("--page-limit", type=int, default=None, help="Max pages allowed (omit for unlimited)")

    # delete-user
    du = sub.add_parser("delete-user", help="Delete a user and their data")
    du.add_argument("--email", required=True)

    # set-limit
    sl = sub.add_parser("set-limit", help="Set page limit for a user")
    sl.add_argument("--email", required=True)
    sl.add_argument("--pages", type=int, required=True, help="Page limit (0 for unlimited)")

    # grant-pages
    gp = sub.add_parser("grant-pages", help="Grant bonus page credits to a user")
    gp.add_argument("--email", required=True)
    gp.add_argument("--pages", type=int, required=True, help="Number of bonus pages to add")

    # usage
    sub.add_parser("usage", help="Show usage statistics for all users")

    args = parser.parse_args()

    if args.command == "create-user":
        asyncio.run(create_user(args.email, args.password, args.name, args.org, args.page_limit))
    elif args.command == "delete-user":
        asyncio.run(delete_user(args.email))
    elif args.command == "set-limit":
        asyncio.run(set_limit(args.email, args.pages or None))
    elif args.command == "grant-pages":
        asyncio.run(grant_pages(args.email, args.pages))
    elif args.command == "usage":
        asyncio.run(show_usage())
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
