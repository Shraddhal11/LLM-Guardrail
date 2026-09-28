import os
import time
import json
import hashlib
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
STORAGE_FILE = os.path.join(DATA_DIR, "audit_store.json")

@dataclass
class AuditReceipt:
    receipt_id: str
    timestamp: float
    user_id: str
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
    Tamper-evident, hash-chained audit logger with persistent disk storage.
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
        self._load_from_disk()

    def _load_from_disk(self):
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

    def _save_to_disk(self):
        try:
            with open(STORAGE_FILE, "w") as f:
                json.dump({
                    "receipts": [asdict(r) for r in self.receipts],
                    "stats": self.stats
                }, f, indent=2)
        except Exception:
            pass

    def log_event(
        self,
        user_id: str,
        request_id: str,
        action_mode: str,
        matches: List[Any],
        latency_ms: float
    ) -> AuditReceipt:
        now = time.time()
        pii_count = len(matches)
        
        categories = list(set([m.category_name for m in matches]))
        pii_details = [
            {
                "category_id": m.category_id,
                "category_name": m.category_name,
                "entity_type": m.entity_type,
                "confidence": round(m.confidence, 3),
                "redacted_sample": f"[{m.entity_type}]"
            }
            for m in matches
        ]

        # Calculate tamper-evident SHA-256 hash chain
        payload = {
            "user_id": user_id,
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

        self._save_to_disk()
        return receipt

    def get_recent_receipts(self, limit: int = 50) -> List[Dict[str, Any]]:
        return [asdict(r) for r in reversed(self.receipts[-limit:])]

    def get_stats(self) -> Dict[str, Any]:
        return self.stats

audit_logger = AuditLogger()
