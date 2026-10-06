-- v1.1: store the redacted prompt (what the model actually saw) on each event.
-- Additive only: no data is dropped or changed.
-- Stored only when decision = 'redact', so raw PII is never written here.

BEGIN;

ALTER TABLE events ADD COLUMN IF NOT EXISTS anonymized_text text;

COMMIT;
