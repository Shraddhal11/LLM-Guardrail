-- v0: schema as it exists today on the shared Neon DB (dumped 2026-10-03).
-- Read-only reference. Do not run on a fresh DB; use v1_upgrade.sql for the new schema.

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
-- Name: pii_detected_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pii_detected_items (
    id character varying(36) NOT NULL,
    query_log_id character varying(36) NOT NULL,
    user_uuid character varying(64) NOT NULL,
    category_id integer NOT NULL,
    category_name character varying(128) NOT NULL,
    entity_type character varying(128) NOT NULL,
    original_text text,
    placeholder_token character varying(128) NOT NULL,
    confidence double precision,
    start_char integer,
    end_char integer,
    created_at timestamp without time zone
);


--
-- Name: query_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_logs (
    id character varying(36) NOT NULL,
    user_id character varying(36),
    user_uuid character varying(64) NOT NULL,
    request_id character varying(64) NOT NULL,
    endpoint character varying(255) NOT NULL,
    model character varying(255) NOT NULL,
    original_prompt text,
    anonymized_prompt text,
    llm_response text,
    pii_count integer,
    categories_found text,
    action_mode character varying(32),
    latency_ms double precision,
    previous_hash character varying(64) NOT NULL,
    current_hash character varying(64) NOT NULL,
    created_at timestamp without time zone
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character varying(36) NOT NULL,
    clerk_user_id character varying(255) NOT NULL,
    email character varying(255),
    name character varying(255),
    user_uuid character varying(64) NOT NULL,
    api_key character varying(255) NOT NULL,
    trust_score double precision,
    created_at timestamp without time zone
);


--
-- Name: pii_detected_items pii_detected_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_detected_items
    ADD CONSTRAINT pii_detected_items_pkey PRIMARY KEY (id);


--
-- Name: query_logs query_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_logs
    ADD CONSTRAINT query_logs_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_pii_detected_items_user_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pii_detected_items_user_uuid ON public.pii_detected_items USING btree (user_uuid);


--
-- Name: ix_query_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_query_logs_request_id ON public.query_logs USING btree (request_id);


--
-- Name: ix_query_logs_user_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_query_logs_user_uuid ON public.query_logs USING btree (user_uuid);


--
-- Name: ix_users_clerk_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_clerk_user_id ON public.users USING btree (clerk_user_id);


--
-- Name: ix_users_user_uuid; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_user_uuid ON public.users USING btree (user_uuid);


--
-- Name: pii_detected_items pii_detected_items_query_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_detected_items
    ADD CONSTRAINT pii_detected_items_query_log_id_fkey FOREIGN KEY (query_log_id) REFERENCES public.query_logs(id);


--
-- Name: query_logs query_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_logs
    ADD CONSTRAINT query_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--


