-- LLM Guardrail database schema: CURRENT (matches what is live on the shared Neon DB).
-- Includes v1 base, v1.1 anonymized_text, v1.2 original_text and users.action_mode.
-- Generated with pg_dump (schema only). Use this to create a fresh database.

--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6 (4e955f5)
-- Dumped by pg_dump version 18.3 (Ubuntu 18.3-1.pgdg22.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    agent_name text NOT NULL,
    parent_agent_id uuid,
    initial_score integer DEFAULT 100 NOT NULL,
    ceiling integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT agents_ceiling_check CHECK (((ceiling >= 0) AND (ceiling <= 100))),
    CONSTRAINT agents_initial_score_check CHECK (((initial_score >= 0) AND (initial_score <= 100)))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL,
    CONSTRAINT categories_id_check CHECK (((id >= 1) AND (id <= 15)))
);


--
-- Name: category_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_packs (
    category_id integer NOT NULL,
    pack_name text NOT NULL
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    agent_id uuid,
    kind text NOT NULL,
    model text,
    action_mode text,
    decision text NOT NULL,
    pii_count integer DEFAULT 0 NOT NULL,
    prompt_tokens integer,
    completion_tokens integer,
    tokens_estimated boolean DEFAULT false NOT NULL,
    latency_ms real,
    tool_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    anonymized_text text,
    original_text text,
    CONSTRAINT events_decision_check CHECK ((decision = ANY (ARRAY['allow'::text, 'redact'::text, 'block'::text, 'deny'::text]))),
    CONSTRAINT events_kind_check CHECK ((kind = ANY (ARRAY['prompt'::text, 'completion'::text, 'tool_call'::text, 'tool_result'::text, 'handoff'::text, 'final_output'::text])))
);


--
-- Name: packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packs (
    name text NOT NULL,
    CONSTRAINT packs_name_check CHECK ((name = ANY (ARRAY['HIPAA'::text, 'DPDP'::text])))
);


--
-- Name: pii_findings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pii_findings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    category_id integer NOT NULL,
    entity_type text NOT NULL,
    placeholder text,
    confidence real,
    text_sha256 character(64) NOT NULL
);


--
-- Name: receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.receipts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    seq integer NOT NULL,
    event_id uuid,
    prev_hash character(64) NOT NULL,
    hash character(64) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: score_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.score_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    delta integer NOT NULL,
    reason text NOT NULL,
    event_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    external_id text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clerk_user_id text,
    email text NOT NULL,
    name text,
    user_uuid text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    action_mode text,
    CONSTRAINT users_action_mode_check CHECK ((action_mode = ANY (ARRAY['ANONYMIZE'::text, 'REDACT'::text, 'HASH'::text, 'BLOCK'::text, 'LOG_ONLY'::text]))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'user'::text])))
);


--
-- Name: agents agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_pkey PRIMARY KEY (id);


--
-- Name: agents agents_session_id_agent_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_session_id_agent_name_key UNIQUE (session_id, agent_name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: category_packs category_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_packs
    ADD CONSTRAINT category_packs_pkey PRIMARY KEY (category_id, pack_name);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: packs packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packs
    ADD CONSTRAINT packs_pkey PRIMARY KEY (name);


--
-- Name: pii_findings pii_findings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_findings
    ADD CONSTRAINT pii_findings_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_pkey PRIMARY KEY (id);


--
-- Name: receipts receipts_session_id_seq_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_session_id_seq_key UNIQUE (session_id, seq);


--
-- Name: score_ledger score_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_ledger
    ADD CONSTRAINT score_ledger_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_user_id_external_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_external_id_key UNIQUE (user_id, external_id);


--
-- Name: users users_clerk_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_clerk_user_id_key UNIQUE (clerk_user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_user_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_user_uuid_key UNIQUE (user_uuid);


--
-- Name: ix_events_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events_agent ON public.events USING btree (agent_id);


--
-- Name: ix_events_session_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_events_session_time ON public.events USING btree (session_id, created_at);


--
-- Name: ix_findings_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_findings_event ON public.pii_findings USING btree (event_id);


--
-- Name: ix_ledger_agent_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ledger_agent_time ON public.score_ledger USING btree (agent_id, created_at);


--
-- Name: ix_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_sessions_user ON public.sessions USING btree (user_id);


--
-- Name: agents agents_parent_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_parent_agent_id_fkey FOREIGN KEY (parent_agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: agents agents_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agents
    ADD CONSTRAINT agents_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: category_packs category_packs_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_packs
    ADD CONSTRAINT category_packs_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: category_packs category_packs_pack_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_packs
    ADD CONSTRAINT category_packs_pack_name_fkey FOREIGN KEY (pack_name) REFERENCES public.packs(name);


--
-- Name: events events_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE SET NULL;


--
-- Name: events events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: pii_findings pii_findings_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_findings
    ADD CONSTRAINT pii_findings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: pii_findings pii_findings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_findings
    ADD CONSTRAINT pii_findings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: receipts receipts_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: receipts receipts_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.receipts
    ADD CONSTRAINT receipts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: score_ledger score_ledger_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_ledger
    ADD CONSTRAINT score_ledger_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.agents(id) ON DELETE CASCADE;


--
-- Name: score_ledger score_ledger_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.score_ledger
    ADD CONSTRAINT score_ledger_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


