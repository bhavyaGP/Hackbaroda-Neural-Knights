import json
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional


class JsonStore:
    """Simple JSON file-based store. Good enough for hackathon demo."""

    def __init__(self, data_dir: str):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        self._cache: Dict[str, Dict] = {}
        self._load_all()

    def _path(self, collection: str) -> str:
        return os.path.join(self.data_dir, f"{collection}.json")

    def _load_all(self):
        for col in ["customers", "conversations", "messages", "tickets", "interventions", "sentiment_logs"]:
            path = self._path(col)
            if os.path.exists(path):
                with open(path, "r") as f:
                    self._cache[col] = json.load(f)
            else:
                self._cache[col] = {}

    def _save(self, collection: str):
        with open(self._path(collection), "w") as f:
            json.dump(self._cache[collection], f, indent=2, default=str)

    def _now(self) -> str:
        return datetime.utcnow().isoformat()

    # ── Customers ──────────────────────────────────────────────────────────────

    def upsert_customer(self, data: dict) -> dict:
        cid = data.get("id") or str(uuid.uuid4())
        record = {**data, "id": cid, "updated_at": self._now()}
        if cid not in self._cache["customers"]:
            record["created_at"] = self._now()
        self._cache["customers"][cid] = record
        self._save("customers")
        return record

    def get_customer(self, cid: str) -> Optional[dict]:
        return self._cache["customers"].get(cid)

    def list_customers(self) -> List[dict]:
        return list(self._cache["customers"].values())

    # ── Conversations ──────────────────────────────────────────────────────────

    def create_conversation(self, customer_id: str, channel: str = "chat") -> dict:
        conv_id = str(uuid.uuid4())
        conv = {
            "id": conv_id,
            "customer_id": customer_id,
            "channel": channel,
            "status": "active",
            "sentiment_score": 0.0,
            "churn_risk": 0.0,
            "intent": "unknown",
            "created_at": self._now(),
            "updated_at": self._now(),
        }
        self._cache["conversations"][conv_id] = conv
        self._cache["messages"][conv_id] = []
        self._save("conversations")
        self._save("messages")
        return conv

    def get_conversation(self, conv_id: str) -> Optional[dict]:
        return self._cache["conversations"].get(conv_id)

    def list_active_conversations(self) -> List[dict]:
        return [c for c in self._cache["conversations"].values() if c["status"] == "active"]

    def list_all_conversations(self) -> List[dict]:
        return list(self._cache["conversations"].values())

    def update_conversation(self, conv_id: str, **kwargs) -> Optional[dict]:
        conv = self._cache["conversations"].get(conv_id)
        if not conv:
            return None
        conv.update(kwargs)
        conv["updated_at"] = self._now()
        self._save("conversations")
        return conv

    def close_conversation(self, conv_id: str):
        self.update_conversation(conv_id, status="closed")

    # ── Messages ───────────────────────────────────────────────────────────────

    def add_message(self, conv_id: str, role: str, content: str, meta: dict = None) -> dict:
        msg = {
            "id": str(uuid.uuid4()),
            "conversation_id": conv_id,
            "role": role,
            "content": content,
            "timestamp": self._now(),
            **(meta or {}),
        }
        if conv_id not in self._cache["messages"]:
            self._cache["messages"][conv_id] = []
        self._cache["messages"][conv_id].append(msg)
        self._save("messages")
        return msg

    def get_messages(self, conv_id: str) -> List[dict]:
        return self._cache["messages"].get(conv_id, [])

    # ── Tickets ────────────────────────────────────────────────────────────────

    def create_ticket(self, customer_id: str, conv_id: str, title: str,
                       description: str, priority: str = "medium") -> dict:
        ticket = {
            "id": str(uuid.uuid4()),
            "customer_id": customer_id,
            "conversation_id": conv_id,
            "title": title,
            "description": description,
            "priority": priority,
            "status": "open",
            "created_at": self._now(),
        }
        self._cache["tickets"][ticket["id"]] = ticket
        self._save("tickets")
        return ticket

    def get_tickets_by_customer(self, customer_id: str) -> List[dict]:
        return [t for t in self._cache["tickets"].values() if t["customer_id"] == customer_id]

    def list_all_tickets(self) -> List[dict]:
        return list(self._cache["tickets"].values())

    # ── Interventions ──────────────────────────────────────────────────────────

    def add_intervention(self, conv_id: str, instruction: str) -> dict:
        iv = {
            "id": str(uuid.uuid4()),
            "conversation_id": conv_id,
            "instruction": instruction,
            "timestamp": self._now(),
            "applied": False,
        }
        if conv_id not in self._cache["interventions"]:
            self._cache["interventions"][conv_id] = []
        self._cache["interventions"][conv_id].append(iv)
        self._save("interventions")
        return iv

    def get_pending_intervention(self, conv_id: str) -> Optional[dict]:
        for iv in self._cache["interventions"].get(conv_id, []):
            if not iv["applied"]:
                return iv
        return None

    def mark_applied(self, conv_id: str, iv_id: str):
        for iv in self._cache["interventions"].get(conv_id, []):
            if iv["id"] == iv_id:
                iv["applied"] = True
        self._save("interventions")

    # ── Sentiment logs ─────────────────────────────────────────────────────────

    def log_sentiment(self, conv_id: str, score: float, churn_risk: float, intent: str):
        entry = {
            "timestamp": self._now(),
            "sentiment_score": score,
            "churn_risk": churn_risk,
            "intent": intent,
        }
        if conv_id not in self._cache["sentiment_logs"]:
            self._cache["sentiment_logs"][conv_id] = []
        self._cache["sentiment_logs"][conv_id].append(entry)
        self._save("sentiment_logs")

    def get_sentiment_logs(self, conv_id: str) -> List[dict]:
        return self._cache["sentiment_logs"].get(conv_id, [])


from core.config import settings
store = JsonStore(settings.DATA_DIR)
