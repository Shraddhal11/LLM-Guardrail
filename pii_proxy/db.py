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

# Convert postgresql:// to use psycopg2 if needed
if DB_URL.startswith("postgres://"):
    DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

engine = sa.create_engine(DB_URL, pool_size=10, max_overflow=20, pool_pre_ping=True)
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
