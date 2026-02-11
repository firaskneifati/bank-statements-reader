#!/usr/bin/env python3
"""CLI management tool for creating users and viewing usage."""

import argparse
import asyncio
import sys

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.db.engine import async_session_factory
from app.db.models import Organization, User, Upload, ExportLog
from app.auth.password import hash_password


async def create_user(email: str, password: str, full_name: str, org_name: str | None):
    if not async_session_factory:
        print("Error: DATABASE_URL not configured")
        sys.exit(1)

    async with async_session_factory() as session:
        existing = await session.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            print(f"Error: {email} already exists")
            sys.exit(1)

        org = Organization(name=org_name or f"{full_name}'s Organization")
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
        print(f"Created user: {email} ({full_name})")


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

            print(f"\n  {name} <{email}>")
            print(f"    Joined: {created.strftime('%Y-%m-%d')}")
            print(f"    Uploads: {uploads}  |  Documents: {docs}  |  Pages: {pages}  |  Transactions: {txns}  |  Exports: {exports}")

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

    # usage
    sub.add_parser("usage", help="Show usage statistics for all users")

    args = parser.parse_args()

    if args.command == "create-user":
        asyncio.run(create_user(args.email, args.password, args.name, args.org))
    elif args.command == "usage":
        asyncio.run(show_usage())
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
