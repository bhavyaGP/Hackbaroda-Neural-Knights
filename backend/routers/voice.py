"""
Twilio voice integration.
Flow: Phone call → Twilio → ngrok → /api/voice/inbound
      User speaks → Twilio STT → /api/voice/gather
      Agent processes → TwiML <Say> response → loops
"""
import re
import asyncio
from fastapi import APIRouter, Form, Query, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from twilio.rest import Client as TwilioClient
from db.store import store
from agents.supervisor import process_message
from memory.hindsight_memory import retain_interaction
from ws.manager import ws_manager
from core.config import settings


def _twilio_client() -> TwilioClient:
    return TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)


class OutboundCallRequest(BaseModel):
    customer_id: str
    phone_override: str | None = None  # optional: call a different number than on file

router = APIRouter()

VOICE = "Polly.Joanna-Neural"  # AWS Polly via Twilio — sounds like Aria


def _clean_for_tts(text: str) -> str:
    """Strip chars that break TwiML XML."""
    text = re.sub(r"[<>&\"'\\]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:1200]  # Twilio TTS limit


def _find_customer_by_phone(from_number: str):
    """Match Twilio From number to a seeded customer."""
    digits = re.sub(r"\D", "", from_number)  # strip non-digits
    for c in store.list_customers():
        c_digits = re.sub(r"\D", "", c.get("phone", ""))
        # Match last 10 digits (ignores country code differences)
        if c_digits and c_digits[-10:] == digits[-10:]:
            return c
    return None


def _gather_twiml(action_url: str, prompt: str, fallback: str = "Thank you for calling. Goodbye!") -> str:
    safe_url = action_url.replace("&", "&amp;")  # & is invalid in XML attributes
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="speech" action="{safe_url}" method="POST"
            timeout="6" speechTimeout="auto" language="en-US">
        <Say voice="{VOICE}">{prompt}</Say>
    </Gather>
    <Say voice="{VOICE}">{fallback}</Say>
</Response>"""


# ── Inbound call ───────────────────────────────────────────────────────────────

@router.post("/inbound")
async def voice_inbound(
    From: str = Form(default=""),
    CallSid: str = Form(default=""),
):
    """Twilio calls this webhook when a call comes in."""
    customer = _find_customer_by_phone(From)

    if customer:
        customer_id = customer["id"]
        customer_name = customer["name"]
    else:
        # Unknown caller — create a guest profile
        customer_id = f"guest_{CallSid[-8:]}"
        customer_name = "there"
        store.upsert_customer({
            "id": customer_id,
            "name": "Guest Caller",
            "email": f"{From}@guest",
            "phone": From,
            "tier": "standard",
            "products": [],
            "subscription_status": "active",
            "lifetime_value": 0.0,
        })

    # Create voice conversation
    conv = store.create_conversation(customer_id, "voice")
    conv_id = conv["id"]

    greeting = f"Hello {customer_name}! I'm Aria, your dedicated support specialist. I have your account pulled up. How can I help you today?"

    store.add_message(conv_id, "assistant", greeting)
    print(f"\n[VOICE] Inbound call from {From} → matched customer: {customer_id} ({customer_name})")
    print(f"[VOICE] Conv ID: {conv_id}")

    # Notify dashboard of incoming call
    await ws_manager.broadcast_conversation_update(conv_id, "conversation_started", {
        "customer_name": customer_name if customer else "Unknown Caller",
        "customer_tier": customer.get("tier", "standard") if customer else "standard",
        "channel": "voice",
        "from_number": From,
        "sentiment_score": 0.0,
        "churn_risk": 0.0,
    })

    action = f"/api/voice/gather?customer_id={customer_id}&conv_id={conv_id}"
    twiml = _gather_twiml(action, _clean_for_tts(greeting))
    return Response(content=twiml, media_type="application/xml")


# ── Speech gather (conversation turn) ─────────────────────────────────────────

@router.post("/gather")
async def voice_gather(
    customer_id: str = Query(...),
    conv_id: str = Query(...),
    SpeechResult: str = Form(default=""),
    Confidence: str = Form(default="0"),
):
    """Twilio posts transcribed speech here after each gather."""
    speech = SpeechResult.strip()

    print(f"\n{'='*60}")
    print(f"[VOICE] Customer ({customer_id}): {speech!r}  conf={Confidence}")

    if not speech:
        print("[VOICE] Empty speech — re-prompting")
        action = f"/api/voice/gather?customer_id={customer_id}&conv_id={conv_id}"
        twiml = _gather_twiml(action, "I'm sorry, I didn't catch that. Could you please repeat?")
        return Response(content=twiml, media_type="application/xml")

    # Detect hangup intent
    if any(w in speech.lower() for w in ["goodbye", "bye", "hang up", "end call", "that's all", "no thank you"]):
        store.close_conversation(conv_id)
        await ws_manager.broadcast_conversation_update(conv_id, "conversation_closed", {})
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="{VOICE}">Thank you for calling. I hope we resolved everything for you. Have a wonderful day!</Say>
    <Hangup/>
</Response>"""
        return Response(content=twiml, media_type="application/xml")

    customer = store.get_customer(customer_id) or {
        "id": customer_id, "name": "Caller", "tier": "standard",
        "products": [], "subscription_status": "active", "lifetime_value": 0.0,
    }

    # Store customer speech as message
    store.add_message(conv_id, "customer", speech)
    history = store.get_messages(conv_id)[:-1]  # exclude the one just added

    # Check for owner intervention
    pending_iv = store.get_pending_intervention(conv_id)
    owner_instruction = pending_iv["instruction"] if pending_iv else None

    try:
        agent_resp = await process_message(
            customer_id=customer_id,
            conversation_id=conv_id,
            customer_message=speech,
            conversation_history=history,
            customer_profile=customer,
            owner_instruction=owner_instruction,
        )

        if pending_iv:
            store.mark_applied(conv_id, pending_iv["id"])
            print(f"[VOICE] Owner instruction applied: {owner_instruction!r}")

        ai_text = agent_resp.response
        print(f"[VOICE] Intent={agent_resp.intent}  Sentiment={agent_resp.sentiment_score:.2f}  Churn={agent_resp.churn_risk:.2f}")
        print(f"[VOICE] Agents: {', '.join(agent_resp.agents_used)}")
        print(f"[VOICE] AI → {ai_text[:120]}{'...' if len(ai_text) > 120 else ''}")
        store.add_message(conv_id, "assistant", ai_text, {
            "agents_used": agent_resp.agents_used,
            "sentiment_score": agent_resp.sentiment_score,
            "churn_risk": agent_resp.churn_risk,
        })
        store.update_conversation(
            conv_id,
            sentiment_score=agent_resp.sentiment_score,
            churn_risk=agent_resp.churn_risk,
            intent=agent_resp.intent,
        )
        store.log_sentiment(conv_id, agent_resp.sentiment_score, agent_resp.churn_risk, agent_resp.intent)

        # Fire-and-forget: retain in Hindsight + notify dashboard
        asyncio.create_task(retain_interaction(
            customer_id=customer_id,
            customer_message=speech,
            ai_response=ai_text,
            sentiment_score=agent_resp.sentiment_score,
            churn_risk=agent_resp.churn_risk,
            intent=agent_resp.intent,
            memory_note=agent_resp.memory_note,
        ))
        asyncio.create_task(ws_manager.broadcast_conversation_update(conv_id, "message_update", {
            "customer_id": customer_id,
            "customer_name": customer.get("name", "Caller"),
            "customer_tier": customer.get("tier", "standard"),
            "sentiment_score": agent_resp.sentiment_score,
            "churn_risk": agent_resp.churn_risk,
            "intent": agent_resp.intent,
            "agents_used": agent_resp.agents_used,
            "last_message": speech[:80],
            "negotiation_offer": agent_resp.actions.negotiation_offer.model_dump() if agent_resp.actions.negotiation_offer else None,
            "owner_instruction_applied": bool(owner_instruction),
        }))

        # Auto-create ticket on voice if needed
        if agent_resp.actions.create_ticket and agent_resp.actions.ticket_title:
            store.create_ticket(
                customer_id, conv_id,
                agent_resp.actions.ticket_title,
                speech,
                agent_resp.actions.ticket_priority,
            )

    except Exception as e:
        ai_text = "I apologize, I'm experiencing a technical issue. Let me make a note of your concern and have a specialist follow up with you shortly."

    action = f"/api/voice/gather?customer_id={customer_id}&conv_id={conv_id}"
    twiml = _gather_twiml(
        action,
        _clean_for_tts(ai_text),
        fallback="Thank you for your patience. Is there anything else I can help you with?",
    )
    return Response(content=twiml, media_type="application/xml")


# ── Status callback ────────────────────────────────────────────────────────────

@router.post("/status")
async def voice_status(
    CallSid: str = Form(default=""),
    CallStatus: str = Form(default=""),
):
    """Twilio posts call status updates here (completed, no-answer, etc.)."""
    if CallStatus in ("completed", "failed", "busy", "no-answer"):
        # Find and close any active voice conversations linked to this call
        for conv in store.list_active_conversations():
            if conv.get("channel") == "voice":
                store.close_conversation(conv["id"])
    return Response(content="OK", media_type="text/plain")


# ── Outbound call ──────────────────────────────────────────────────────────────

@router.post("/call")
async def outbound_call(body: OutboundCallRequest):
    """
    Twilio calls the customer's phone number.
    Customer picks up → same voice AI flow starts.
    Triggered from dashboard or make_call.py script.
    """
    if not settings.TWILIO_ACCOUNT_SID or settings.TWILIO_ACCOUNT_SID.startswith("AC_"):
        raise HTTPException(400, "Twilio credentials not configured in .env")

    customer = store.get_customer(body.customer_id)
    if not customer:
        raise HTTPException(404, f"Customer {body.customer_id} not found")

    to_number = body.phone_override or customer.get("phone", "")
    if not to_number:
        raise HTTPException(400, "No phone number on customer record. Pass phone_override.")

    # Normalise Indian numbers: +91-XXXX → +91XXXX
    to_number = re.sub(r"(?<=\+\d{2})-", "", to_number)

    # TwiML webhook URL — must be publicly reachable by Twilio
    webhook_url = f"{settings.NGROK_URL.rstrip('/')}/api/voice/outbound-answer?customer_id={body.customer_id}"

    try:
        client = _twilio_client()
        call = client.calls.create(
            to=to_number,
            from_=settings.TWILIO_PHONE_NUMBER,
            url=webhook_url,
            method="POST",
            status_callback=f"{settings.NGROK_URL.rstrip('/')}/api/voice/status",
            status_callback_method="POST",
        )
    except Exception as e:
        raise HTTPException(502, f"Twilio error: {e}")

    # Create conversation so dashboard shows it immediately
    conv = store.create_conversation(body.customer_id, "voice")
    store.add_message(conv["id"], "system", f"Outbound call initiated to {to_number} — SID: {call.sid}")

    await ws_manager.broadcast_conversation_update(conv["id"], "conversation_started", {
        "customer_name": customer["name"],
        "customer_tier": customer.get("tier", "standard"),
        "channel": "voice",
        "direction": "outbound",
        "to_number": to_number,
        "call_sid": call.sid,
        "sentiment_score": 0.0,
        "churn_risk": 0.0,
    })

    return {
        "status": "dialing",
        "call_sid": call.sid,
        "to": to_number,
        "conversation_id": conv["id"],
        "customer_name": customer["name"],
    }


@router.post("/outbound-answer")
async def outbound_answer(
    customer_id: str = Query(...),
    CallSid: str = Form(default=""),
):
    """
    Twilio fetches this when customer picks up the outbound call.
    Finds the pre-created conversation and starts the AI greeting.
    """
    customer = store.get_customer(customer_id) or {
        "id": customer_id, "name": "there", "tier": "standard",
        "products": [], "subscription_status": "active", "lifetime_value": 0.0,
    }

    # Find the most recent active voice conv for this customer
    conv = None
    for c in sorted(store.list_active_conversations(),
                    key=lambda x: x.get("created_at", ""), reverse=True):
        if c["customer_id"] == customer_id and c["channel"] == "voice":
            conv = c
            break

    if not conv:
        conv = store.create_conversation(customer_id, "voice")

    conv_id = conv["id"]
    greeting = (
        f"Hello {customer['name']}! This is Aria from support. "
        f"Thank you for taking our call. "
        f"I have your account pulled up and I'm here to assist you. "
        f"How can I help you today?"
    )
    store.add_message(conv_id, "assistant", greeting)
    print(f"\n[VOICE] Outbound answered — customer: {customer_id} ({customer['name']})")
    print(f"[VOICE] Conv ID: {conv_id}")

    action = f"/api/voice/gather?customer_id={customer_id}&conv_id={conv_id}"
    twiml = _gather_twiml(action, _clean_for_tts(greeting))
    return Response(content=twiml, media_type="application/xml")
