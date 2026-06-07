from __future__ import annotations
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class Customer(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    tier: Literal["standard", "premium", "enterprise"] = "standard"
    products: List[str] = []
    subscription_status: Literal["active", "trial", "inactive", "cancelled"] = "active"
    lifetime_value: float = 0.0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class MessageIn(BaseModel):
    content: str
    customer_id: str
    conversation_id: Optional[str] = None


class ConversationCreate(BaseModel):
    customer_id: str
    channel: Literal["chat", "voice"] = "chat"


class InterventionIn(BaseModel):
    conversation_id: str
    instruction: str


class NegotiationOffer(BaseModel):
    type: Literal["refund", "discount", "replacement", "credit", "upgrade", "extension"]
    value: str
    description: str


class AgentActions(BaseModel):
    create_ticket: bool = False
    ticket_priority: Literal["low", "medium", "high", "critical"] = "medium"
    ticket_title: Optional[str] = None
    negotiation_offer: Optional[NegotiationOffer] = None
    escalate: bool = False
    schedule_followup: bool = False
    followup_note: Optional[str] = None


class AgentResponse(BaseModel):
    response: str
    sentiment_score: float = Field(ge=-1.0, le=1.0)
    churn_risk: float = Field(ge=0.0, le=1.0)
    intent: str
    agents_used: List[str] = []
    actions: AgentActions = AgentActions()
    memory_note: Optional[str] = None


class ConversationMessage(BaseModel):
    id: str
    conversation_id: str
    role: Literal["customer", "assistant", "system"]
    content: str
    timestamp: str
    meta: Dict[str, Any] = {}


class DashboardConversation(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    customer_tier: str
    channel: str
    status: str
    sentiment_score: float
    churn_risk: float
    intent: str
    message_count: int
    created_at: str
    last_message: Optional[str] = None


class CustomerIntelligence(BaseModel):
    customer: dict
    memory_summary: str
    tickets: List[dict] = []
    sentiment_trend: List[dict] = []
    churn_risk: float
    risk_level: Literal["low", "medium", "high", "critical"]
    recommended_actions: List[str] = []
