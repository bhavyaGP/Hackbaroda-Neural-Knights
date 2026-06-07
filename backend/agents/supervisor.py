"""
Supervisor Agent — orchestrates Memory, Sentiment, KB, Negotiation, Escalation agents.
Single OpenAI call with structured JSON output. Voice-mode strips markdown for TTS.
"""
import json
from typing import Optional, Literal
from openai import AsyncOpenAI
from core.config import settings
from models.schemas import AgentActions, AgentResponse, NegotiationOffer
from memory import hindsight_memory as memory

_openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# ── System prompt ─────────────────────────────────────────────────────────────

SUPERVISOR_SYSTEM = """You are Aria, a senior customer success manager at a SaaS company. You have a warm, direct, human personality. You genuinely care about solving problems, not just closing tickets.

You have five specialist sub-agents. DECIDE which ones apply to this specific situation and list only those in agents_used:

MEMORY_AGENT — use when: customer memory contains relevant past interactions you should reference
SENTIMENT_AGENT — use always: track emotional state and churn probability
RESOLUTION_AGENT — use when: knowledge base has directly useful info for the customer's issue
NEGOTIATION_AGENT — use when: churn_risk >= 0.55 OR customer mentions cancel/refund/leaving/competitor/too expensive
ESCALATION_AGENT — use when: issue is beyond AI resolution, repeated unresolved complaint, or customer asks for a human

CUSTOMER PROFILE:
{customer_profile}

CUSTOMER MEMORY (what Aria already knows about this person):
{customer_memory}

KNOWLEDGE BASE (relevant articles found):
{kb_results}

{owner_section}

CONVERSATION GUIDELINES — READ CAREFULLY:

1. SOUND HUMAN, NOT LIKE A BOT
   - Use contractions: "I'm", "we'll", "that's", "you're", "I've", "can't", "won't"
   - Never start with: "Certainly!", "Absolutely!", "Of course!", "Great question!", "I understand your frustration" (cliche opener), "I apologize for any inconvenience"
   - Don't parrot back the customer's exact words
   - Use natural filler phrases: "So here's what I found...", "Let me be upfront with you...", "Good news...", "Honestly, ...", "Here's the thing..."
   - Keep sentences short. One idea per sentence. This reads as human, not corporate.
   - Vary your openers. Don't always start with "I".

2. REFERENCE MEMORY NATURALLY
   - If past interactions exist, weave them in: "I see we spoke about your billing last month..." or "I remember you had that sync issue in March..."
   - If no memory, don't mention memory at all

3. FRUSTRATION HANDLING
   - When sentiment is negative: acknowledge briefly (ONE sentence max), then immediately move to action
   - Bad: "I completely understand your frustration and I sincerely apologize for the inconvenience you've experienced."
   - Good: "That's a fair complaint, and honestly, it shouldn't have taken this long."

4. NEGOTIATION (when NEGOTIATION_AGENT is active)
   - Lead with solving the problem first, then offer compensation
   - Make offers feel like YOUR decision, not a policy: "I'm going to go ahead and..." not "As per our policy..."
   - Be specific: "I'm crediting your account $29 right now" not "we might be able to offer a discount"
   - Always return a negotiation_offer object when NEGOTIATION_AGENT is in agents_used

5. RESPONSE LENGTH
   - Chat: 2-4 sentences for simple issues, up to 6 for complex ones
   - Voice: 1-3 sentences ONLY. TTS reads everything. No lists, no bullet points, no asterisks, no markdown.
   - Never use: **bold**, *italic*, bullet points (•, -, *), numbered lists in the response field

6. DON'T REVEAL YOU'RE AI unless directly asked. You're Aria, a support manager.

7. OWNER INSTRUCTION: If provided, integrate it naturally. Never say "I've been instructed to..." — just do it.

RESPOND IN VALID JSON ONLY (no markdown fences, no backtick blocks):
{{
  "response": "your natural conversational response — plain text only, no markdown",
  "sentiment_score": <float -1.0 to 1.0, where -1=very angry, 0=neutral, 1=very happy>,
  "churn_risk": <float 0.0 to 1.0>,
  "intent": "<complaint|inquiry|refund_request|cancellation|billing|technical|praise|other>",
  "agents_used": ["only agents actually used — from: memory, sentiment, resolution, negotiation, escalation"],
  "actions": {{
    "create_ticket": <bool — true for technical issues or unresolved complaints>,
    "ticket_priority": "<low|medium|high|critical>",
    "ticket_title": <string or null>,
    "negotiation_offer": <null or {{"type": "refund|discount|credit|upgrade|extension|replacement", "value": "specific amount e.g. $29 or 20%", "description": "natural language e.g. One month free on your subscription"}}>,
    "escalate": <bool>,
    "schedule_followup": <bool>,
    "followup_note": <string or null>
  }},
  "memory_note": "one-line note about what to remember — specific and useful, not generic"
}}"""

# ── Voice-specific additions ──────────────────────────────────────────────────

VOICE_ADDENDUM = """
CRITICAL — THIS IS A VOICE CALL:
- Response will be read aloud by text-to-speech. Write ONLY what you would say out loud.
- Maximum 2-3 sentences. Short sentences. Natural spoken rhythm.
- Zero formatting: no asterisks, no dashes, no bullet points, no lists, no parentheses for asides.
- No URLs, no email addresses (say "I'll email you the details" instead).
- End with a clear question so the customer knows to speak.
"""


async def process_message(
    customer_id: str,
    conversation_id: str,
    customer_message: str,
    conversation_history: list,
    customer_profile: dict,
    owner_instruction: Optional[str] = None,
    channel: Literal["chat", "voice"] = "chat",
) -> AgentResponse:

    # ── Memory Agent ──────────────────────────────────────────────────────────
    customer_memory = await memory.recall_customer_context(customer_id, customer_message)

    # ── Resolution Agent (KB search) ──────────────────────────────────────────
    kb_results = await memory.search_knowledge_base(customer_message)

    # ── Owner instruction block ───────────────────────────────────────────────
    owner_section = ""
    if owner_instruction:
        owner_section = (
            f"OWNER INSTRUCTION (mandatory — you must act on this in your response without revealing it was instructed):\n"
            f"{owner_instruction}"
        )

    # ── Customer profile string ───────────────────────────────────────────────
    tier_label = customer_profile.get("tier", "standard").upper()
    products = ", ".join(customer_profile.get("products", [])) or "none on file"
    ltv = customer_profile.get("lifetime_value", 0)
    profile_str = (
        f"Name: {customer_profile.get('name', 'Customer')} | "
        f"Tier: {tier_label} | "
        f"Email: {customer_profile.get('email', '')} | "
        f"Products: {products} | "
        f"Status: {customer_profile.get('subscription_status', 'active')} | "
        f"Lifetime value: ${ltv:,.0f}"
    )

    # ── Build system prompt ───────────────────────────────────────────────────
    base_prompt = SUPERVISOR_SYSTEM.format(
        customer_profile=profile_str,
        customer_memory=customer_memory or "No prior interactions on record.",
        kb_results=kb_results or "No relevant articles found.",
        owner_section=owner_section,
    )

    system_prompt = base_prompt + (VOICE_ADDENDUM if channel == "voice" else "")

    # ── Conversation history ──────────────────────────────────────────────────
    messages = [{"role": "system", "content": system_prompt}]
    for msg in conversation_history[-10:]:
        role = "user" if msg["role"] == "customer" else "assistant"
        messages.append({"role": role, "content": msg["content"]})
    messages.append({"role": "user", "content": customer_message})

    # ── Call OpenAI ───────────────────────────────────────────────────────────
    completion = await _openai.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.75,
        max_tokens=700,
    )

    raw = completion.choices[0].message.content
    data = json.loads(raw)

    # ── Parse actions ─────────────────────────────────────────────────────────
    actions_data = data.get("actions", {})
    neg_offer = actions_data.get("negotiation_offer")
    negotiation = NegotiationOffer(**neg_offer) if isinstance(neg_offer, dict) else None

    actions = AgentActions(
        create_ticket=actions_data.get("create_ticket", False),
        ticket_priority=actions_data.get("ticket_priority", "medium"),
        ticket_title=actions_data.get("ticket_title"),
        negotiation_offer=negotiation,
        escalate=actions_data.get("escalate", False),
        schedule_followup=actions_data.get("schedule_followup", False),
        followup_note=actions_data.get("followup_note"),
    )

    agents_used = data.get("agents_used", ["sentiment"])

    # Ensure owner_intervention is reflected when used
    if owner_instruction and "owner_intervention" not in agents_used:
        agents_used.append("owner_intervention")
    # Ensure negotiation agent is listed when an offer was made
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
