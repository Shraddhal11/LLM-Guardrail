import hashlib
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import Request

MAX_ID_LENGTH = 128


@dataclass(frozen=True)
class Identity:
    session_external_id: str
    agent_name: str
    parent_agent_name: Optional[str]


def _header(request: Request, name: str) -> Optional[str]:
    value = (request.headers.get(name) or "").strip()
    return value[:MAX_ID_LENGTH] or None


def _text_of(content: Any) -> str:
    if isinstance(content, list):
        return " ".join(c.get("text", "") for c in content if isinstance(c, dict) and c.get("type") == "text")
    return str(content or "")


def conversation_key(messages: Optional[List[Any]]) -> Optional[str]:
    """Hash of the first user message. Chat clients resend the full history, so this stays fixed for one task."""
    for m in messages or []:
        if isinstance(m, dict) and m.get("role") == "user":
            text = _text_of(m.get("content"))
            if text:
                return hashlib.sha256(text.encode()).hexdigest()[:16]
    return None


def identity_from_request(request: Request, user_uuid: str, messages: Optional[List[Any]] = None) -> Identity:
    """
    Session priority: X-Session-ID header, then the conversation fingerprint,
    then one session per user per hour. Agent defaults to 'default'.
    """
    key = conversation_key(messages)
    fallback = f"conv-{key}" if key else f"auto-{user_uuid}-{datetime.now(timezone.utc):%Y%m%d%H}"
    session_id = _header(request, "X-Session-ID") or fallback
    agent_name = _header(request, "X-Agent-ID") or "default"
    parent_name = _header(request, "X-Parent-Agent-ID")
    return Identity(session_external_id=session_id, agent_name=agent_name, parent_agent_name=parent_name)
