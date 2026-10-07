-- v1 upgrade: sessions, agents, events, findings, score ledger, per-session receipts.
--
-- STATUS: DRAFT. Not run anywhere yet.
-- DESTRUCTIVE: drops query_logs, pii_detected_items and users (all current data).
-- Before running: back up the current tables (see db/migrations/README.md).
-- Run through scripts/migrate_v1.py, which backs up the current tables first.

BEGIN;

DROP TABLE IF EXISTS pii_detected_items;
DROP TABLE IF EXISTS query_logs;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id text UNIQUE,
    email         text NOT NULL UNIQUE,
    name          text,
    user_uuid     text NOT NULL UNIQUE,
    role          text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE packs (
    name  text PRIMARY KEY CHECK (name IN ('HIPAA', 'DPDP'))
);

CREATE TABLE categories (
    id    integer PRIMARY KEY CHECK (id BETWEEN 1 AND 15),
    name  text NOT NULL
);

CREATE TABLE category_packs (
    category_id integer NOT NULL REFERENCES categories(id),
    pack_name   text NOT NULL REFERENCES packs(name),
    PRIMARY KEY (category_id, pack_name)
);

CREATE TABLE sessions (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_id  text,
    started_at   timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, external_id)
);

CREATE TABLE agents (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_name      text NOT NULL,
    parent_agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
    initial_score   integer NOT NULL DEFAULT 100 CHECK (initial_score BETWEEN 0 AND 100),
    ceiling         integer NOT NULL DEFAULT 100 CHECK (ceiling BETWEEN 0 AND 100),
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, agent_name)
);

CREATE TABLE events (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    agent_id          uuid REFERENCES agents(id) ON DELETE SET NULL,
    kind              text NOT NULL CHECK (kind IN
                        ('prompt', 'completion', 'tool_call', 'tool_result', 'handoff', 'final_output')),
    model             text,
    action_mode       text,
    decision          text NOT NULL CHECK (decision IN ('allow', 'redact', 'block', 'deny')),
    pii_count         integer NOT NULL DEFAULT 0,
    prompt_tokens     integer,
    completion_tokens integer,
    tokens_estimated  boolean NOT NULL DEFAULT false,
    latency_ms        real,
    tool_name         text,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pii_findings (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id     uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    category_id  integer NOT NULL REFERENCES categories(id),
    entity_type  text NOT NULL,
    placeholder  text,
    confidence   real,
    text_sha256  char(64) NOT NULL
);

CREATE TABLE score_ledger (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id   uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    delta      integer NOT NULL,
    reason     text NOT NULL,
    event_id   uuid REFERENCES events(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE receipts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    seq        integer NOT NULL,
    event_id   uuid REFERENCES events(id) ON DELETE SET NULL,
    prev_hash  char(64) NOT NULL,
    hash       char(64) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (session_id, seq)
);

CREATE INDEX ix_sessions_user       ON sessions (user_id);
CREATE INDEX ix_events_session_time ON events (session_id, created_at);
CREATE INDEX ix_events_agent        ON events (agent_id);
CREATE INDEX ix_findings_event      ON pii_findings (event_id);
CREATE INDEX ix_ledger_agent_time   ON score_ledger (agent_id, created_at);

INSERT INTO packs (name) VALUES ('HIPAA'), ('DPDP');

INSERT INTO categories (id, name) VALUES
    (1,  'Names'),
    (2,  'Geographical Data'),
    (3,  'Dates (Individual)'),
    (4,  'Telephone Numbers'),
    (5,  'Fax Numbers'),
    (6,  'Email Addresses'),
    (7,  'Social Security Numbers (SSN)'),
    (8,  'Medical Record Numbers (MRN)'),
    (9,  'Health Plan Beneficiary Numbers'),
    (10, 'Account Numbers'),
    (11, 'Certificate/License Numbers'),
    (12, 'Vehicle Identifiers'),
    (13, 'Device Identifiers'),
    (14, 'Web URLs'),
    (15, 'IP Addresses');

-- Every category belongs to both packs (team decision).
INSERT INTO category_packs (category_id, pack_name)
SELECT c.id, p.name FROM categories c CROSS JOIN packs p;

COMMIT;

-- Promote an admin AFTER that person has logged in once (their users row is created on first login):
-- UPDATE users SET role = 'admin' WHERE email = 'you@gmail.com';
