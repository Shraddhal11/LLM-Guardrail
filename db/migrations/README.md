# Database migrations

| File | What it is | Runs on |
|---|---|---|
| `db/schema/v0_current.sql` | Schema as it is today (dumped from the shared Neon DB). Reference only. | nothing |
| `db/migrations/v1_upgrade.sql` | Draft of the new schema. Destructive. | not run yet |

## Before running any migration

Back up the current data first. Run this from the repo root, using the connection string in `pii_proxy/db.py`:

```bash
mkdir -p data
/usr/lib/postgresql/18/bin/pg_dump "<DATABASE_URL>" --data-only --column-inserts > data/backup_$(date +%Y%m%d_%H%M).sql
```

Use the Postgres 18 client, because the server is Postgres 18 and `pg_dump` must match the server version.

## Running a migration

```bash
psql "<DATABASE_URL>" -f db/migrations/v1_upgrade.sql
```

The file runs inside one transaction, so a failure rolls everything back.

## Making someone admin

After that person has logged in once through the dashboard (which creates their `users` row):

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@gmail.com';
```
