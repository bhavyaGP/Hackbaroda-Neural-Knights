from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from db.store import store
from models.schemas import InterventionIn
from ws.manager import ws_manager
from memory.hindsight_memory import reflect_customer_profile

router = APIRouter()


def _risk_level(churn_risk: float) -> str:
    if churn_risk >= 0.75:
        return "critical"
    if churn_risk >= 0.5:
        return "high"
    if churn_risk >= 0.25:
        return "medium"
    return "low"


@router.get("/conversations")
async def list_conversations():
    convs = store.list_all_conversations()
    result = []
    for c in sorted(convs, key=lambda x: x.get("updated_at", ""), reverse=True):
        customer = store.get_customer(c["customer_id"]) or {}
        messages = store.get_messages(c["id"])
        last_msg = messages[-1]["content"][:80] if messages else None
        result.append({
            **c,
            "customer_name": customer.get("name", "Unknown"),
            "customer_tier": customer.get("tier", "standard"),
            "message_count": len(messages),
            "last_message": last_msg,
            "risk_level": _risk_level(c.get("churn_risk", 0.0)),
        })
    return result


@router.get("/conversations/{conv_id}/intelligence")
async def get_customer_intelligence(conv_id: str):
    conv = store.get_conversation(conv_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")

    customer = store.get_customer(conv["customer_id"]) or {}
    tickets = store.get_tickets_by_customer(conv["customer_id"])
    sentiment_logs = store.get_sentiment_logs(conv_id)
    churn_risk = conv.get("churn_risk", 0.0)

    # Build recommended actions based on risk
    recommended_actions = []
    if churn_risk >= 0.75:
        recommended_actions = [
            "Offer immediate escalation to senior support",
            "Consider 1-month free extension",
            "Schedule call with Customer Success Manager",
            "Offer discount on renewal",
        ]
    elif churn_risk >= 0.5:
        recommended_actions = [
            "Validate concerns thoroughly before solutions",
            "Offer replacement or store credit",
            "Offer product training session",
        ]
    elif churn_risk >= 0.25:
        recommended_actions = [
            "Resolve issue promptly",
            "Follow up within 24 hours",
            "Check if issue is recurring",
        ]
    else:
        recommended_actions = [
            "Standard resolution flow",
            "Upsell opportunity — customer is satisfied",
        ]

    return {
        "customer": customer,
        "conversation": conv,
        "tickets": tickets,
        "sentiment_logs": sentiment_logs,
        "churn_risk": churn_risk,
        "risk_level": _risk_level(churn_risk),
        "recommended_actions": recommended_actions,
        "messages": store.get_messages(conv_id),
    }


@router.post("/intervene")
async def owner_intervene(body: InterventionIn):
    conv = store.get_conversation(body.conversation_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")

    iv = store.add_intervention(body.conversation_id, body.instruction)

    # Notify conversation participants that owner is watching
    await ws_manager.send_to_conversation(body.conversation_id, {
        "event": "owner_active",
        "message": "Support specialist is reviewing your case...",
    })

    # Notify dashboard
    await ws_manager.broadcast_to_dashboard({
        "event": "intervention_added",
        "conversation_id": body.conversation_id,
        "instruction": body.instruction,
        "timestamp": iv["timestamp"],
    })

    return {"status": "queued", "intervention": iv}


@router.get("/metrics")
async def get_metrics():
    all_convs = store.list_all_conversations()
    active = [c for c in all_convs if c["status"] == "active"]
    tickets = store.list_all_tickets()

    high_risk = [c for c in active if c.get("churn_risk", 0) >= 0.5]
    avg_sentiment = (
        sum(c.get("sentiment_score", 0) for c in active) / len(active)
        if active else 0.0
    )

    return {
        "active_conversations": len(active),
        "total_conversations": len(all_convs),
        "high_risk_customers": len(high_risk),
        "open_tickets": len([t for t in tickets if t["status"] == "open"]),
        "avg_sentiment": round(avg_sentiment, 2),
        "resolved_today": len([c for c in all_convs if c["status"] == "closed"]),
    }


@router.websocket("/ws")
async def dashboard_websocket(websocket: WebSocket):
    await ws_manager.connect_dashboard(websocket)
    # Send current state on connect
    try:
        metrics = {
            "event": "connected",
            "message": "Dashboard connected to CIA real-time feed",
        }
        import json
        await websocket.send_text(json.dumps(metrics))
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_dashboard(websocket)
