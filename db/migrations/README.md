# Database files

## Latest schema (use this to create a fresh database)
`db/schema/schema_current.sql`

## Migrations, in order
| File | What it does | Status |
|---|---|---|
| `001_base_schema_v1.sql` | Base v1 schema. Drops and recreates the tables (destructive, back up first). | applied |
| `002_add_anonymized_text.sql` | Adds the redacted text column to events. | applied |
| `003_add_original_text_and_user_handling.sql` | Adds the original text column and the per-user handling setting. | applied |

Run one by hand with: `psql "<DATABASE_URL>" -f db/migrations/00X_name.sql`

## Reference only
`db/schema/schema_before_v1.sql`: the schema before v1 (old tables).

## Backups
`scripts/migrate_v1.py` backs up the tables to `data/backups/` before dropping anything.

## Making someone admin
After the user has logged in once, run this (replace the email):
```bash
python3 -c "import psycopg2,sys; c=psycopg2.connect(sys.argv[1]); cur=c.cursor(); cur.execute(\"UPDATE users SET role='admin' WHERE email=%s\", (sys.argv[2],)); c.commit(); print(cur.rowcount, 'row(s) updated')" "<DATABASE_URL>" "their@gmail.com"
```
