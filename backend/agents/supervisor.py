"""
Supervisor Agent — orchestrates Memory, Sentiment, KB, Negotiation, Escalation agents.
Runs Hindsight recall + reflect in parallel for richer customer context.
"""
import json
import asyncio
from typing import Optional, Literal
from openai import AsyncOpenAI
from core.config import settings
from models.schemas import AgentActions, AgentResponse, NegotiationOffer
from memory import hindsight_memory as memory

_openai = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

# ── System prompt ─────────────────────────────────────────────────────────────

SUPERVISOR_SYSTEM = """You are Aria, a senior customer success manager. You're warm, direct, and you genuinely solve problems — you don't just close tickets.

You have five specialist sub-agents. Decide which ones apply and list ONLY those in agents_used:

MEMORY_AGENT — use when: customer memory contains relevant past interactions to reference
SENTIMENT_AGENT — use always: track emotional state and churn probability
RESOLUTION_AGENT — use when: knowledge base has directly useful info for this issue
NEGOTIATION_AGENT — use when: churn_risk >= 0.55 OR customer mentions cancel/refund/leaving/competitor/too expensive
ESCALATION_AGENT — use when: issue is beyond AI resolution, repeated unresolved complaint, or customer requests a human

---

CUSTOMER PROFILE:
{customer_profile}

CUSTOMER HISTORY SUMMARY (what Aria already knows about this person from past sessions):
{customer_profile_summary}

RELEVANT PAST INTERACTIONS (semantically matched to current issue):
{customer_memory}

KNOWLEDGE BASE:
{kb_results}

{owner_section}

---

RESPONSE RULES — follow all of these:

1. SOUND HUMAN
   - Use contractions: "I'm", "we'll", "that's", "I've", "can't"
   - Never open with: "Certainly!", "Absolutely!", "Of course!", "Great question!", "I completely understand your frustration", "I sincerely apologize for the inconvenience"
   - Don't echo the customer's exact words back at them
   - Use natural phrases: "So here's what I found...", "Good news...", "Honestly...", "Let me be upfront...", "Here's the thing..."
   - Short sentences. One idea per sentence. This sounds human, not corporate.

2. USE PAST HISTORY
   - If the history summary or past interactions mention a prior complaint, reference it: "I see we dealt with a billing issue last month..." or "You had that same sync problem in March..."
   - If no history exists, don't invent any.

3. OWNER INTERVENTION — CRITICAL RULE
   - When an OWNER INSTRUCTION is present, you MUST start your response with a brief natural bridge phrase (1 sentence only) that signals you have an update, BEFORE delivering the instruction's content.
   - The bridge should feel organic to the conversation. Examples:
     * "Actually, hold on — I just pulled something up that might help here."
     * "Let me check one thing real quick... okay, so I have some good news."
     * "One moment — I'm looking at your account right now."
     * "Actually, I just flagged something on your account."
   - Then naturally deliver whatever the instruction says.
   - DO NOT say "I've been told to..." or "My manager said..." — just do it naturally.
   - ONLY skip the bridge if the instruction is purely informational and doesn't change your response direction.

4. FRUSTRATED CUSTOMERS
   - Acknowledge briefly (ONE sentence), then immediately take action
   - Bad: "I completely understand your frustration and I sincerely apologize..."
   - Good: "That's a fair complaint — let me fix this."

5. NEGOTIATION (when NEGOTIATION_AGENT is active)
   - Solve the problem first, then offer compensation
   - Make offers feel like YOUR decision: "I'm going to credit your account $29 right now" not "per our policy we may offer..."
   - Always return a negotiation_offer object when NEGOTIATION_AGENT is used

6. NEVER END THE CONVERSATION
   - Do NOT say goodbye, "have a great day", "take care", "thanks for calling", or any closing phrase
   - Always end your response with an open question or "Is there anything else I can help you with?" to keep the conversation going
   - The customer ends the conversation — not you

7. RESPONSE LENGTH
   - Chat: 2-5 sentences for most issues
   - Voice: 1-3 short sentences ONLY. TTS reads everything aloud. No markdown, no lists, no bullet points, no asterisks, no URLs.

RESPOND IN VALID JSON ONLY — no markdown fences:
{{
  "response": "your natural conversational response — plain text only",
  "sentiment_score": <float -1.0 to 1.0>,
  "churn_risk": <float 0.0 to 1.0>,
  "intent": "<complaint|inquiry|refund_request|cancellation|billing|technical|praise|other>",
  "agents_used": ["only agents actually used"],
  "actions": {{
    "create_ticket": <bool>,
    "ticket_priority": "<low|medium|high|critical>",
    "ticket_title": <string or null>,
    "negotiation_offer": <null or {{"type": "refund|discount|credit|upgrade|extension|replacement", "value": "e.g. $29 or 20%", "description": "one natural sentence e.g. One month free on your subscription"}}>,
    "escalate": <bool>,
    "schedule_followup": <bool>,
    "followup_note": <string or null>
  }},
  "memory_note": "specific one-line note to remember — e.g. Customer reported dashboard crashes on Safari v17, offered $20 credit"
}}"""

VOICE_ADDENDUM = """
CRITICAL — VOICE CALL:
- Max 2-3 sentences. Short sentences. Natural spoken rhythm.
- Zero formatting: no asterisks, dashes, bullet points, lists, parentheses for asides, URLs, email addresses.
- End with a spoken question so caller knows to respond.
- NEVER say anything that sounds like goodbye or a call ending.
"""


async def process_message(
    customer_id: str,
    conversation_id: str,
    customer_message: str,
    conversation_history: list,
    customer_profile: dict,
    owner_interventions: Optional[dict] = None,  # {"new": [...], "history": [...]}
    channel: Literal["chat", "voice"] = "chat",
) -> AgentResponse:

    # ── Run Hindsight recall + profile reflect + KB search in parallel ────────
    customer_memory, customer_profile_summary, kb_results = await asyncio.gather(
        memory.recall_customer_context(customer_id, customer_message),
        memory.reflect_customer_profile(customer_id),
        memory.search_knowledge_base(customer_message),
    )

    # ── Build owner section from full intervention history ────────────────────
    owner_section = ""
    new_ivs     = (owner_interventions or {}).get("new", [])
    history_ivs = (owner_interventions or {}).get("history", [])

    if new_ivs or history_ivs:
        lines = ["OWNER INSTRUCTIONS FOR THIS CONVERSATION:"]
        if history_ivs:
            lines.append("\n[Already actioned — keep as ongoing context throughout the conversation]:")
            for iv in history_ivs:
                lines.append(f"  - {iv['instruction']}")
        if new_ivs:
            lines.append("\n[NEW — act on these now, start response with a natural bridge phrase]:")
            for iv in new_ivs:
                lines.append(f"  - {iv['instruction']}")
        owner_section = "\n".join(lines)

    # ── Customer profile string ───────────────────────────────────────────────
    tier_label = customer_profile.get("tier", "standard").upper()
    products   = ", ".join(customer_profile.get("products", [])) or "none on file"
    ltv        = customer_profile.get("lifetime_value", 0)
    profile_str = (
        f"Name: {customer_profile.get('name', 'Customer')} | "
        f"Tier: {tier_label} | "
        f"Email: {customer_profile.get('email', '')} | "
        f"Products: {products} | "
        f"Status: {customer_profile.get('subscription_status', 'active')} | "
        f"Lifetime value: ${ltv:,.0f}"
    )

    system_prompt = SUPERVISOR_SYSTEM.format(
        customer_profile=profile_str,
        customer_profile_summary=customer_profile_summary or "New customer — no prior history.",
        customer_memory=customer_memory or "No previous interactions on record.",
        kb_results=kb_results or "No relevant articles found.",
        owner_section=owner_section,
    )

    if channel == "voice":
        system_prompt += VOICE_ADDENDUM

    # ── Conversation history (last 10 turns) ─────────────────────────────────
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

    raw  = completion.choices[0].message.content
    data = json.loads(raw)

    # ── Parse actions ─────────────────────────────────────────────────────────
    actions_data = data.get("actions", {})
    neg_offer    = actions_data.get("negotiation_offer")
    negotiation  = NegotiationOffer(**neg_offer) if isinstance(neg_offer, dict) else None

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
    if new_ivs and "owner_intervention" not in agents_used:
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


async def generate_call_summary(history: list, customer_name: str) -> str:
    """Generate a natural, short closing statement for when the customer ends a voice call."""
    first_name = customer_name.split()[0] if customer_name and customer_name != "there" else "there"

    # Build a brief summary of what was discussed
    topics = []
    for msg in history:
        if msg.get("role") == "customer" and msg.get("content"):
            topics.append(msg["content"][:80])
        if len(topics) >= 5:
            break

    context = " | ".join(topics) if topics else "general support"

    try:
        resp = await _openai.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Aria, a support agent. Generate ONE short natural closing sentence "
                        "for the end of a phone call. 1-2 sentences max. Warm but brief. "
                        "No 'certainly', no 'absolutely'. Sound human. Do NOT say goodbye or take care at the end "
                        "— just wrap up what was accomplished and say you're here if they need anything."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Call with {first_name}. Topics discussed: {context}. Generate a natural closing statement.",
                },
            ],
            temperature=0.7,
            max_tokens=80,
        )
        return resp.choices[0].message.content.strip().strip('"')
    except Exception:
        return f"Glad we got that sorted out, {first_name}. I'm here if you need anything else."
