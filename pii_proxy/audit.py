import os
import time
import json
import hashlib
import uuid
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from pii_proxy.db import SessionLocal, DBQueryLog, DBPIIDetectedItem, DBUser

STORAGE_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "audit_store.json")

@dataclass
class AuditReceipt:
    receipt_id: str
    timestamp: float
    user_id: str
    user_uuid: str
    request_id: str
    action_mode: str
    pii_count: int
    categories_found: List[str]
    pii_details: List[Dict[str, Any]]
    previous_hash: str
    current_hash: str
    latency_ms: float

class AuditLogger:
    """
    Tamper-evident, hash-chained audit logger with Neon PostgreSQL + persistent disk storage.
    """
    def __init__(self):
        self.receipts: List[AuditReceipt] = []
        self.last_hash: str = "GENESIS_HASH_00000000000000000000000000000000"
        self.stats = {
            "total_requests": 0,
            "total_pii_detected": 0,
            "category_counts": {},
            "action_counts": {}
        }
        self._load_from_db_and_disk()

    def _load_from_db_and_disk(self):
        """Load past records from Neon DB or disk."""
        db = None
        try:
            db = SessionLocal()
            logs = db.query(DBQueryLog).order_by(DBQueryLog.created_at.asc()).all()
            if logs:
                for log in logs:
                    cats = json.loads(log.categories_found) if log.categories_found else []
                    receipt = AuditReceipt(
                        receipt_id=f"rcpt_{len(self.receipts) + 1:06d}",
                        timestamp=log.created_at.timestamp() if log.created_at else time.time(),
                        user_id=log.user_id or "cline_user",
                        user_uuid=log.user_uuid or "default_user",
                        request_id=log.request_id,
                        action_mode=log.action_mode,
                        pii_count=log.pii_count,
                        categories_found=cats,
                        pii_details=[],
                        previous_hash=log.previous_hash,
                        current_hash=log.current_hash,
                        latency_ms=log.latency_ms
                    )
                    self.receipts.append(receipt)
                    self.last_hash = log.current_hash
                    self.stats["total_requests"] += 1
                    self.stats["total_pii_detected"] += log.pii_count
                    self.stats["action_counts"][log.action_mode] = self.stats["action_counts"].get(log.action_mode, 0) + 1
                    for c in cats:
                        self.stats["category_counts"][c] = self.stats["category_counts"].get(c, 0) + 1
                return
        except Exception as e:
            pass
        finally:
            if db:
                db.close()

        # Fallback to local json file
        if os.path.exists(STORAGE_FILE):
            try:
                with open(STORAGE_FILE, "r") as f:
                    data = json.load(f)
                    receipt_dicts = data.get("receipts", [])
                    self.receipts = [AuditReceipt(**r) for r in receipt_dicts]
                    if self.receipts:
                        self.last_hash = self.receipts[-1].current_hash
                    self.stats = data.get("stats", self.stats)
            except Exception:
                pass

    def log_event(
        self,
        user_id: str,
        user_uuid: str,
        request_id: str,
        action_mode: str,
        matches: List[Any],
        latency_ms: float,
        endpoint: str = "/v1/chat/completions",
        model: str = "nvidia/Qwen3.6-35B-A3B-NVFP4",
        original_prompt: str = "",
        anonymized_prompt: str = "",
        vault: Any = None
    ) -> AuditReceipt:
        now = time.time()
        pii_count = len(matches)
        
        categories = list(set([m.category_name for m in matches]))
        pii_details = []

        for m in matches:
            placeholder = vault.get_or_create_placeholder(m.text, m.entity_type) if vault else f"[{m.entity_type}]"
            pii_details.append({
                "category_id": m.category_id,
                "category_name": m.category_name,
                "entity_type": m.entity_type,
                "confidence": round(m.confidence, 3),
                "original_text": m.text,
                "placeholder_token": placeholder,
                "redacted_sample": f"[{m.entity_type}]"
            })

        # Calculate tamper-evident SHA-256 hash chain
        payload = {
            "user_id": user_id,
            "user_uuid": user_uuid,
            "request_id": request_id,
            "action_mode": action_mode,
            "pii_count": pii_count,
            "categories": sorted(categories),
            "timestamp": now,
            "previous_hash": self.last_hash
        }
        payload_bytes = json.dumps(payload, sort_keys=True).encode()
        current_hash = hashlib.sha256(payload_bytes).hexdigest()

        receipt = AuditReceipt(
            receipt_id=f"rcpt_{len(self.receipts) + 1:06d}",
            timestamp=now,
            user_id=user_id,
            user_uuid=user_uuid,
            request_id=request_id,
            action_mode=action_mode,
            pii_count=pii_count,
            categories_found=categories,
            pii_details=pii_details,
            previous_hash=self.last_hash,
            current_hash=current_hash,
            latency_ms=round(latency_ms, 2)
        )

        self.receipts.append(receipt)
        self.last_hash = current_hash

        # Update stats
        self.stats["total_requests"] += 1
        self.stats["total_pii_detected"] += pii_count
        self.stats["action_counts"][action_mode] = self.stats["action_counts"].get(action_mode, 0) + 1
        for cat in categories:
            self.stats["category_counts"][cat] = self.stats["category_counts"].get(cat, 0) + 1

        # Write asynchronously to Neon PostgreSQL
        db = None
        try:
            db = SessionLocal()
            # Lookup internal user DB id if available
            db_user = db.query(DBUser).filter(DBUser.user_uuid == user_uuid).first()
            internal_user_id = db_user.id if db_user else None

            log_entry = DBQueryLog(
                user_id=internal_user_id,
                user_uuid=user_uuid,
                request_id=request_id,
                endpoint=endpoint,
                model=model,
                original_prompt=original_prompt,
                anonymized_prompt=anonymized_prompt,
                pii_count=pii_count,
                categories_found=json.dumps(categories),
                action_mode=action_mode,
                latency_ms=round(latency_ms, 2),
                previous_hash=payload["previous_hash"],
                current_hash=current_hash
            )
            db.add(log_entry)
            db.flush()  # gets log_entry.id

            for detail in pii_details:
                pii_item = DBPIIDetectedItem(
                    query_log_id=log_entry.id,
                    user_uuid=user_uuid,
                    category_id=detail["category_id"],
                    category_name=detail["category_name"],
                    entity_type=detail["entity_type"],
                    original_text=detail["original_text"],
                    placeholder_token=detail["placeholder_token"],
                    confidence=detail["confidence"]
                )
                db.add(pii_item)

            db.commit()
        except Exception as e:
            if db:
                db.rollback()
        finally:
            if db:
                db.close()

        # Save to local JSON backup
        try:
            with open(STORAGE_FILE, "w") as f:
                json.dump({
                    "receipts": [asdict(r) for r in self.receipts],
                    "stats": self.stats
                }, f, indent=2)
        except Exception:
            pass

        return receipt

    def get_recent_receipts(self, limit: int = 50, user_uuid: Optional[str] = None) -> List[Dict[str, Any]]:
        if user_uuid:
            filtered = [r for r in self.receipts if r.user_uuid == user_uuid]
            return [asdict(r) for r in reversed(filtered[-limit:])]
        return [asdict(r) for r in reversed(self.receipts[-limit:])]

    def get_stats(self, user_uuid: Optional[str] = None) -> Dict[str, Any]:
        if user_uuid:
            user_receipts = [r for r in self.receipts if r.user_uuid == user_uuid]
            total_pii = sum(r.pii_count for r in user_receipts)
            cat_counts = {}
            for r in user_receipts:
                for c in r.categories_found:
                    cat_counts[c] = cat_counts.get(c, 0) + 1
            return {
                "total_requests": len(user_receipts),
                "total_pii_detected": total_pii,
                "category_counts": cat_counts
            }
        return self.stats

audit_logger = AuditLogger()
