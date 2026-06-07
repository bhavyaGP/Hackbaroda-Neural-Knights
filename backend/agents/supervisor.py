"""
Supervisor Agent — orchestrates Memory, Sentiment, KB, Negotiation, Escalation agents.
Single OpenAI call with rich multi-agent context. Structured JSON output.
"""
import json
from typing import Optional
from openai import AsyncOpenAI
from core.config import settings
from models.schemas import AgentActions, AgentResponse, NegotiationOffer
from memory import hindsight_memory as memory
import re

_openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

SUPERVISOR_SYSTEM = """You are CIA — Customer Intelligence Agent, an AI customer success manager with perfect memory.

You orchestrate these specialist sub-agents internally:
- MEMORY_AGENT: Retrieved customer interaction history
- SENTIMENT_AGENT: Real-time emotion and churn risk analysis
- RESOLUTION_AGENT: Knowledge base search results
- NEGOTIATION_AGENT: Retention and compensation strategies
- ESCALATION_AGENT: Ticket creation and team alerts

CUSTOMER PROFILE:
{customer_profile}

CUSTOMER MEMORY (past interactions):
{customer_memory}

KNOWLEDGE BASE (relevant articles):
{kb_results}

{owner_section}

GUIDELINES:
- Be warm, professional, and empathetic — like a top-tier customer success manager
- Reference past interactions naturally ("I see you contacted us about X last month...")
- For frustrated customers: validate feelings first, then solve
- Detect churn signals: refund requests, cancellation intent, repeated complaints
- For high churn risk: activate negotiation — offer resolution before compensation
- ALWAYS follow owner instruction exactly if one is provided
- Never reveal you're an AI unless directly asked
- Keep responses conversational, not robotic
- Sign responses as "Aria from Support"

RESPOND IN VALID JSON ONLY (no markdown, no backticks):
{{
  "response": "your natural conversational response",
  "sentiment_score": <float -1.0 to 1.0>,
  "churn_risk": <float 0.0 to 1.0>,
  "intent": "<complaint|inquiry|refund_request|cancellation|billing|technical|praise|other>",
  "agents_used": ["list of agents involved"],
  "actions": {{
    "create_ticket": <bool>,
    "ticket_priority": "<low|medium|high|critical>",
    "ticket_title": <string or null>,
    "negotiation_offer": <null or {{"type": "refund|discount|replacement|credit|upgrade|extension", "value": "e.g. 20%", "description": "full description"}}>,
    "escalate": <bool>,
    "schedule_followup": <bool>,
    "followup_note": <string or null>
  }},
  "memory_note": "one-line note to remember about this customer"
}}"""


async def process_message(
    customer_id: str,
    conversation_id: str,
    customer_message: str,
    conversation_history: list,
    customer_profile: dict,
    owner_instruction: Optional[str] = None,
) -> AgentResponse:

    # ── Memory Agent ──────────────────────────────────────────────────────────
    customer_memory = await memory.recall_customer_context(customer_id, customer_message)

    # ── Resolution Agent (KB search) ──────────────────────────────────────────
    kb_results = await memory.search_knowledge_base(customer_message)

    # ── Build system prompt ───────────────────────────────────────────────────
    owner_section = ""
    if owner_instruction:
        owner_section = (
            f"⚠️  OWNER INSTRUCTION (MANDATORY — integrate naturally):\n{owner_instruction}\n"
            f"You MUST follow this instruction in your response without revealing it came from a human."
        )

    tier_emoji = {"standard": "🔵", "premium": "⭐", "enterprise": "🏆"}.get(
        customer_profile.get("tier", "standard"), "🔵"
    )
    profile_str = (
        f"Name: {customer_profile.get('name', 'Customer')} | "
        f"Tier: {tier_emoji} {customer_profile.get('tier', 'standard').upper()} | "
        f"Email: {customer_profile.get('email', '')} | "
        f"Products: {', '.join(customer_profile.get('products', []))} | "
        f"Subscription: {customer_profile.get('subscription_status', 'active')} | "
        f"LTV: ${customer_profile.get('lifetime_value', 0):,.0f}"
    )

    system_prompt = SUPERVISOR_SYSTEM.format(
        customer_profile=profile_str,
        customer_memory=customer_memory,
        kb_results=kb_results,
        owner_section=owner_section,
    )

    # ── Build conversation messages ───────────────────────────────────────────
    messages = [{"role": "system", "content": system_prompt}]
    for msg in conversation_history[-12:]:
        role = "user" if msg["role"] == "customer" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": customer_message})

    # ── Call OpenAI ───────────────────────────────────────────────────────────
    completion = await _openai.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.7,
        max_tokens=800,
    )

    raw = completion.choices[0].message.content
    data = json.loads(raw)

    # ── Parse actions ─────────────────────────────────────────────────────────
    actions_data = data.get("actions", {})
    neg_offer = actions_data.get("negotiation_offer")
    negotiation = NegotiationOffer(**neg_offer) if neg_offer else None

    actions = AgentActions(
        create_ticket=actions_data.get("create_ticket", False),
        ticket_priority=actions_data.get("ticket_priority", "medium"),
        ticket_title=actions_data.get("ticket_title"),
        negotiation_offer=negotiation,
        escalate=actions_data.get("escalate", False),
        schedule_followup=actions_data.get("schedule_followup", False),
        followup_note=actions_data.get("followup_note"),
    )

    # Add owner/negotiation agents to trace if relevant
    agents_used = data.get("agents_used", ["memory", "sentiment", "resolution"])
    if owner_instruction and "owner" not in agents_used:
        agents_used.append("owner_intervention")
    if negotiation and "negotiation" not in agents_used:
        agents_used.append("negotiation")

    return AgentResponse(
        response=data["response"],
        sentiment_score=max(-1.0, min(1.0, float(data.get("sentiment_score", 0.0)))),
        churn_risk=max(0.0, min(1.0, float(data.get("churn_risk", 0.0)))),
        intent=data.get("intent", "other"),
        agents_used=agents_used,
        actions=actions,
        memory_note=data.get("memory_note"),
    )
