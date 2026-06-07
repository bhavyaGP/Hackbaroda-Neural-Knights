"""
Customer memory backed by Hindsight.
Each customer gets their own bank: customer_{id}
Knowledge base lives in bank: cia_knowledge_base

Design: store richly structured turns so recall surfaces "customer complained about X, resolved with Y"
"""
from datetime import datetime
from typing import Optional
from hindsight_client import Hindsight
from core.config import settings

_client: Optional[Hindsight] = None


def get_hindsight() -> Hindsight:
    global _client
    if _client is None:
        _client = Hindsight(
            base_url=settings.HINDSIGHT_BASE_URL,
            api_key=settings.HINDSIGHT_API_KEY,
        )
    return _client


def _customer_bank(customer_id: str) -> str:
    return f"customer_{customer_id}"


async def recall_customer_context(customer_id: str, query: str) -> str:
    """Retrieve semantically relevant customer memories for the current issue."""
    try:
        client = get_hindsight()
        resp = await client.arecall(
            bank_id=_customer_bank(customer_id),
            query=query,
            max_tokens=1500,
            budget="mid",
        )
        return resp.results or "No previous interactions found."
    except Exception as e:
        return f"Memory recall unavailable: {e}"


async def reflect_customer_profile(customer_id: str) -> str:
    """
    Generate a narrative summary of this customer's history, problems, and patterns.
    Used as the 'Customer History Summary' section in the supervisor prompt.
    """
    try:
        client = get_hindsight()
        resp = await client.areflect(
            bank_id=_customer_bank(customer_id),
            query=(
                "Summarize: (1) What recurring or major problems has this customer reported? "
                "(2) How satisfied are they overall? "
                "(3) What resolutions or offers have been given to them before? "
                "(4) Any notable patterns in their communication or frustration level?"
            ),
            budget="low",
        )
        return resp.answer or "New customer — no prior history on record."
    except Exception as e:
        return f"Profile summary unavailable: {e}"


async def retain_interaction(
    customer_id: str,
    customer_message: str,
    ai_response: str,
    sentiment_score: float,
    churn_risk: float,
    intent: str,
    memory_note: Optional[str] = None,
):
    """
    Store a support interaction in the customer's Hindsight bank.
    Structured format ensures future recalls surface problem+resolution clearly.
    """
    try:
        client = get_hindsight()

        sentiment_label = (
            "positive" if sentiment_score > 0.3
            else "negative" if sentiment_score < -0.3
            else "neutral"
        )
        churn_label = (
            "critical" if churn_risk >= 0.75
            else "high" if churn_risk >= 0.5
            else "medium" if churn_risk >= 0.25
            else "low"
        )

        content = (
            f"[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC]\n"
            f"PROBLEM: {customer_message}\n"
            f"RESOLUTION: {ai_response}\n"
            f"INTENT: {intent} | SENTIMENT: {sentiment_label} ({sentiment_score:.2f}) | "
            f"CHURN RISK: {churn_label} ({churn_risk:.2f})"
        )
        if memory_note:
            content += f"\nKEY NOTE: {memory_note}"

        await client.aretain(
            bank_id=_customer_bank(customer_id),
            content=content,
            tags=["interaction", intent, sentiment_label, f"churn_{churn_label}"],
        )
    except Exception as e:
        print(f"[Memory] Failed to retain interaction for {customer_id}: {e}")


async def retain_kb_article(title: str, content: str, category: str):
    """Store a knowledge base article in the shared KB bank."""
    try:
        client = get_hindsight()
        await client.aretain(
            bank_id=settings.KB_BANK_ID,
            content=f"[{category}] {title}\n\n{content}",
            tags=["kb", category],
            document_id=title.lower().replace(" ", "_")[:50],
        )
    except Exception as e:
        print(f"[KB] Failed to retain article '{title}': {e}")


async def search_knowledge_base(query: str) -> str:
    """Semantic search across the company knowledge base."""
    try:
        client = get_hindsight()
        resp = await client.arecall(
            bank_id=settings.KB_BANK_ID,
            query=query,
            max_tokens=1000,
            budget="mid",
        )
        return resp.results or "No relevant knowledge base articles found."
    except Exception as e:
        return f"Knowledge base search unavailable: {e}"


async def seed_customer_history(customer_id: str, interactions: list[dict]):
    """Bulk-seed historical interactions for a customer (demo use)."""
    try:
        client = get_hindsight()
        for ix in interactions:
            content = (
                f"[{ix.get('date', '2024')}]\n"
                f"PROBLEM: {ix['customer']}\n"
                f"RESOLUTION: {ix['resolution']}\n"
                f"OUTCOME: {ix.get('outcome', 'resolved')}"
            )
            if ix.get("type"):
                content += f"\nINTENT: {ix['type']}"
            await client.aretain(
                bank_id=_customer_bank(customer_id),
                content=content,
                tags=["history", ix.get("type", "support"), "seeded"],
            )
    except Exception as e:
        print(f"[Memory] Seed failed for {customer_id}: {e}")
