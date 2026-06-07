import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from models.schemas import MessageIn, ConversationCreate, AgentResponse
from db.store import store
from agents.supervisor import process_message
from memory.hindsight_memory import retain_interaction
from ws.manager import ws_manager

router = APIRouter()


@router.post("/start")
async def start_conversation(body: ConversationCreate):
    customer = store.get_customer(body.customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")

    conv = store.create_conversation(body.customer_id, body.channel)

    # Greeting message - use first name, natural tone
    first_name = customer['name'].split()[0]
    greeting = f"Hey {first_name}, I'm Aria from support. What can I help you with today?"
    store.add_message(conv["id"], "assistant", greeting)

    await ws_manager.broadcast_conversation_update(conv["id"], "conversation_started", {
        "customer_name": customer["name"],
        "customer_tier": customer.get("tier", "standard"),
        "channel": body.channel,
        "sentiment_score": 0.0,
        "churn_risk": 0.0,
    })

    return {
        "conversation_id": conv["id"],
        "greeting": greeting,
        "customer": customer,
    }


@router.post("/message")
async def send_message(body: MessageIn):
    conv_id = body.conversation_id
    if not conv_id:
        raise HTTPException(400, "conversation_id required")

    conv = store.get_conversation(conv_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")

    customer = store.get_customer(body.customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")

    # Store customer message (capture object for live broadcast)
    customer_msg = store.add_message(conv_id, "customer", body.content)
    history = store.get_messages(conv_id)

    # Get full intervention history (new + already applied)
    owner_interventions = store.get_all_interventions(conv_id)

    # Run supervisor
    agent_resp: AgentResponse = await process_message(
        customer_id=body.customer_id,
        conversation_id=conv_id,
        customer_message=body.content,
        conversation_history=history[:-1],
        customer_profile=customer,
        owner_interventions=owner_interventions,
    )

    # Mark all pending interventions applied now that agent has processed them
    store.mark_all_pending_applied(conv_id)

    # Store AI response
    ai_msg = store.add_message(conv_id, "assistant", agent_resp.response, {
        "agents_used": agent_resp.agents_used,
        "sentiment_score": agent_resp.sentiment_score,
        "churn_risk": agent_resp.churn_risk,
    })

    # Update conversation metrics
    store.update_conversation(
        conv_id,
        sentiment_score=agent_resp.sentiment_score,
        churn_risk=agent_resp.churn_risk,
        intent=agent_resp.intent,
    )
    store.log_sentiment(conv_id, agent_resp.sentiment_score, agent_resp.churn_risk, agent_resp.intent)

    # Auto-create ticket if needed
    if agent_resp.actions.create_ticket and agent_resp.actions.ticket_title:
        store.create_ticket(
            body.customer_id, conv_id,
            agent_resp.actions.ticket_title,
            body.content,
            agent_resp.actions.ticket_priority,
        )

    # Retain in Hindsight memory (don't block response)
    asyncio.create_task(retain_interaction(
        customer_id=body.customer_id,
        customer_message=body.content,
        ai_response=agent_resp.response,
        sentiment_score=agent_resp.sentiment_score,
        churn_risk=agent_resp.churn_risk,
        intent=agent_resp.intent,
        memory_note=agent_resp.memory_note,
    ))

    # Push real-time update to dashboard — include full message objects so UI can append directly
    await ws_manager.broadcast_conversation_update(conv_id, "message_update", {
        "customer_id": body.customer_id,
        "customer_name": customer["name"],
        "customer_tier": customer.get("tier", "standard"),
        "sentiment_score": agent_resp.sentiment_score,
        "churn_risk": agent_resp.churn_risk,
        "intent": agent_resp.intent,
        "agents_used": agent_resp.agents_used,
        "last_message": body.content[:80],
        "new_messages": [customer_msg, ai_msg],
        "negotiation_offer": agent_resp.actions.negotiation_offer.model_dump() if agent_resp.actions.negotiation_offer else None,
        "owner_instruction_applied": bool(owner_interventions.get("new")),
    })

    # Push AI response to conversation WebSocket
    await ws_manager.send_to_conversation(conv_id, {
        "event": "ai_message",
        "message": ai_msg,
        "agents_used": agent_resp.agents_used,
        "sentiment_score": agent_resp.sentiment_score,
        "churn_risk": agent_resp.churn_risk,
        "negotiation_offer": agent_resp.actions.negotiation_offer.model_dump() if agent_resp.actions.negotiation_offer else None,
    })

    return {
        "message": ai_msg,
        "agents_used": agent_resp.agents_used,
        "sentiment_score": agent_resp.sentiment_score,
        "churn_risk": agent_resp.churn_risk,
        "intent": agent_resp.intent,
        "actions": agent_resp.actions.model_dump(),
    }


@router.get("/{conv_id}/history")
async def get_history(conv_id: str):
    conv = store.get_conversation(conv_id)
    if not conv:
        raise HTTPException(404, "Conversation not found")
    return {
        "conversation": conv,
        "messages": store.get_messages(conv_id),
        "sentiment_logs": store.get_sentiment_logs(conv_id),
    }


@router.post("/{conv_id}/close")
async def close_conversation(conv_id: str):
    store.close_conversation(conv_id)
    await ws_manager.broadcast_conversation_update(conv_id, "conversation_closed", {})
    return {"status": "closed"}


@router.websocket("/ws/{conv_id}")
async def websocket_conversation(websocket: WebSocket, conv_id: str):
    await ws_manager.connect_conversation(conv_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect_conversation(conv_id, websocket)
