import os
import uuid
import time
import json
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

import sqlalchemy as sa
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

DB_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_BIrh05EqdNPs@ep-sweet-grass-b3v25j2p-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
)
if not DB_URL:
    try:
        from dotenv import load_dotenv
        load_dotenv()
        DB_URL = os.getenv("DATABASE_URL")
    except Exception:
        pass

# Normalize connection string
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

def create_db_engine(url: str):
    import ssl
    # 1. Try standard psycopg2 if available and not explicitly using pg8000
    if not os.getenv("VERCEL") and "postgresql+pg8000://" not in url:
        try:
            eng = sa.create_engine(url, pool_size=5, max_overflow=10, pool_pre_ping=True)
            # Test connection
            with eng.connect() as conn:
                conn.execute(sa.text("SELECT 1"))
            return eng
        except Exception as e:
            print(f"Primary psycopg2 DB engine failed: {e}")

    # 2. Try pure-python pg8000 driver (safe for Vercel/Lambda serverless)
    try:
        clean_url = url.replace("postgresql://", "postgresql+pg8000://", 1).replace("postgres://", "postgresql+pg8000://", 1)
        if "?" in clean_url:
            base_url, query = clean_url.split("?", 1)
            query_params = [q for q in query.split("&") if not q.startswith("sslmode=")]
            clean_url = base_url + ("?" + "&".join(query_params) if query_params else "")

        ssl_ctx = ssl.create_default_context()
        eng = sa.create_engine(
            clean_url,
            pool_pre_ping=True,
            connect_args={"ssl_context": ssl_ctx}
        )
        with eng.connect() as conn:
            conn.execute(sa.text("SELECT 1"))
        print("Successfully connected to Neon PostgreSQL via pg8000 pure-python driver.")
        return eng
    except Exception as e:
        print(f"pg8000 DB engine failed: {e}")

    # 3. Fallback to SQLite in /tmp for serverless runtime
    sqlite_path = "/tmp/fallback_pii.db"
    print(f"Using SQLite fallback at {sqlite_path}")
    return sa.create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})

engine = create_db_engine(DB_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class DBUser(Base):
    __tablename__ = "users"

    id = sa.Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    clerk_user_id = sa.Column(sa.String(255), unique=True, index=True, nullable=False)
    email = sa.Column(sa.String(255), nullable=True)
    name = sa.Column(sa.String(255), nullable=True)
    user_uuid = sa.Column(sa.String(64), unique=True, index=True, nullable=False)
    api_key = sa.Column(sa.String(255), nullable=False)
    trust_score = sa.Column(sa.Float, default=100.0)
    created_at = sa.Column(sa.DateTime, default=datetime.utcnow)

    queries = relationship("DBQueryLog", back_populates="user", cascade="all, delete-orphan")


class DBQueryLog(Base):
    __tablename__ = "query_logs"

    id = sa.Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = sa.Column(sa.String(36), sa.ForeignKey("users.id"), nullable=True)
    user_uuid = sa.Column(sa.String(64), index=True, nullable=False)
    request_id = sa.Column(sa.String(64), index=True, nullable=False)
    endpoint = sa.Column(sa.String(255), nullable=False)
    model = sa.Column(sa.String(255), nullable=False)
    original_prompt = sa.Column(sa.Text, nullable=True)
    anonymized_prompt = sa.Column(sa.Text, nullable=True)
    llm_response = sa.Column(sa.Text, nullable=True)
    pii_count = sa.Column(sa.Integer, default=0)
    categories_found = sa.Column(sa.Text, nullable=True)  # JSON string array
    action_mode = sa.Column(sa.String(32), default="ANONYMIZE")
    latency_ms = sa.Column(sa.Float, default=0.0)
    previous_hash = sa.Column(sa.String(64), nullable=False)
    current_hash = sa.Column(sa.String(64), nullable=False)
    created_at = sa.Column(sa.DateTime, default=datetime.utcnow)

    user = relationship("DBUser", back_populates="queries")
    pii_items = relationship("DBPIIDetectedItem", back_populates="query_log", cascade="all, delete-orphan")


class DBPIIDetectedItem(Base):
    __tablename__ = "pii_detected_items"

    id = sa.Column(sa.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    query_log_id = sa.Column(sa.String(36), sa.ForeignKey("query_logs.id"), nullable=False)
    user_uuid = sa.Column(sa.String(64), index=True, nullable=False)
    category_id = sa.Column(sa.Integer, nullable=False)
    category_name = sa.Column(sa.String(128), nullable=False)
    entity_type = sa.Column(sa.String(128), nullable=False)
    original_text = sa.Column(sa.Text, nullable=True)
    placeholder_token = sa.Column(sa.String(128), nullable=False)
    confidence = sa.Column(sa.Float, default=0.95)
    start_char = sa.Column(sa.Integer, nullable=True)
    end_char = sa.Column(sa.Integer, nullable=True)
    created_at = sa.Column(sa.DateTime, default=datetime.utcnow)

    query_log = relationship("DBQueryLog", back_populates="pii_items")


def init_db():
    """Create all tables in Neon PostgreSQL database."""
    Base.metadata.create_all(bind=engine)


def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
