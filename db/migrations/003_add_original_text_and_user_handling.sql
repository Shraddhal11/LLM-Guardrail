-- v1.2: per-user PII handling and before/after prompts.
-- Additive only.
--
-- events.original_text: the prompt as the user sent it. TEMPORARY for the hackathon, so the
-- dashboard can show before vs after. Remove it (drop the column) before any real use.
-- users.action_mode: this user's handling choice. NULL means use the global default.

BEGIN;

ALTER TABLE events ADD COLUMN IF NOT EXISTS original_text text;

ALTER TABLE users ADD COLUMN IF NOT EXISTS action_mode text
    CHECK (action_mode IN ('ANONYMIZE', 'REDACT', 'HASH', 'BLOCK', 'LOG_ONLY'));

COMMIT;
