#!/usr/bin/env python3
"""Back up the current tables to JSON, then apply db/migrations/v1_upgrade.sql.

The backup is written first. If it fails, nothing is dropped.

Usage (from the repo root, with the venv active):
    python scripts/migrate_v1.py --database-url "postgresql://..." --dry-run   # show plan only
    python scripts/migrate_v1.py --database-url "postgresql://..."             # asks to confirm
"""
import argparse
import datetime as dt
import decimal
import json
import os
import sys
import uuid

import psycopg2
import psycopg2.extras

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIGRATION_FILE = os.path.join(ROOT, "db", "migrations", "v1_upgrade.sql")
BACKUP_ROOT = os.path.join(ROOT, "data", "backups")
TABLES = ["pii_detected_items", "query_logs", "users"]


def json_default(value):
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, decimal.Decimal):
        return float(value)
    if isinstance(value, uuid.UUID):
        return str(value)
    raise TypeError(f"cannot serialize {type(value)}")


def table_exists(conn, name):
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass(%s)", (f"public.{name}",))
        return cur.fetchone()[0] is not None


def current_counts(conn):
    counts = {}
    for table in TABLES:
        if not table_exists(conn, table):
            counts[table] = None
            continue
        with conn.cursor() as cur:
            cur.execute(f'SELECT count(*) FROM "{table}"')
            counts[table] = cur.fetchone()[0]
    return counts


def backup(conn, outdir):
    os.makedirs(outdir, exist_ok=True)
    counts = {}
    for table in TABLES:
        if not table_exists(conn, table):
            counts[table] = None
            continue
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(f'SELECT * FROM "{table}"')
            rows = [dict(r) for r in cur.fetchall()]
        path = os.path.join(outdir, f"{table}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(rows, f, default=json_default, indent=2)
        with open(path, encoding="utf-8") as f:
            if len(json.load(f)) != len(rows):
                raise RuntimeError(f"backup verification failed for {table}")
        counts[table] = len(rows)
    with open(os.path.join(outdir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"created_at": dt.datetime.now().isoformat(), "row_counts": counts}, f, indent=2)
    return counts


def apply_migration(conn):
    with open(MIGRATION_FILE, encoding="utf-8") as f:
        lines = [line for line in f.read().splitlines() if line.strip() not in ("BEGIN;", "COMMIT;")]
    sql = "\n".join(lines)
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def verify(conn):
    expected = {"packs": 2, "categories": 15, "category_packs": 30}
    with conn.cursor() as cur:
        for table, want in expected.items():
            cur.execute(f'SELECT count(*) FROM "{table}"')
            got = cur.fetchone()[0]
            status = "OK" if got == want else "MISMATCH"
            print(f"  {table:<16} rows={got:<4} expected={want:<4} {status}")
            if got != want:
                raise RuntimeError(f"{table} has {got} rows, expected {want}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--database-url", default=os.getenv("DATABASE_URL"), help="Postgres URL (or set DATABASE_URL)")
    parser.add_argument("--dry-run", action="store_true", help="show what would happen, change nothing")
    parser.add_argument("--yes", action="store_true", help="skip the confirmation prompt")
    args = parser.parse_args()

    if not args.database_url:
        sys.exit("No database URL. Pass --database-url or set DATABASE_URL.")

    conn = psycopg2.connect(args.database_url)
    try:
        print("Current row counts:")
        for table, count in current_counts(conn).items():
            print(f"  {table:<20} {'(missing)' if count is None else count}")
        print(f"Migration file: {os.path.relpath(MIGRATION_FILE, ROOT)}")

        if args.dry_run:
            print("\nDry run: nothing changed.")
            return

        if not args.yes:
            print("\nThis will back up the tables above to data/backups/, then DROP them and recreate the v1 schema.")
            if input('Type MIGRATE to continue: ').strip() != "MIGRATE":
                sys.exit("Aborted. Nothing changed.")

        stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
        outdir = os.path.join(BACKUP_ROOT, stamp)
        print(f"\n[1/3] Backing up to {os.path.relpath(outdir, ROOT)}/")
        counts = backup(conn, outdir)
        print(f"      {counts}")

        print("[2/3] Applying v1 migration (one transaction)")
        apply_migration(conn)

        print("[3/3] Verifying")
        verify(conn)

        print(f"\nDone. Backup kept at {os.path.relpath(outdir, ROOT)}/")
        print("Next: promote an admin after they log in once:")
        print("  UPDATE users SET role = 'admin' WHERE email = 'you@gmail.com';")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
