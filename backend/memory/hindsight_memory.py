"""
Customer memory backed by Hindsight.
Each customer gets their own bank: customer_{id}
Knowledge base lives in bank: cia_knowledge_base
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
    """Retrieve semantically relevant customer memories."""
    try:
        client = get_hindsight()
        resp = await client.arecall(
            bank_id=_customer_bank(customer_id),
            query=query,
            max_tokens=1500,
            budget="mid",
        )
        return resp.results or "No previous interaction history found."
    except Exception as e:
        return f"Memory unavailable: {e}"


async def reflect_customer_profile(customer_id: str) -> str:
    """Generate a narrative customer profile from memory."""
    try:
        client = get_hindsight()
        resp = await client.areflect(
            bank_id=_customer_bank(customer_id),
            query="Summarize this customer's history, main issues, communication style, and satisfaction level.",
            budget="low",
        )
        return resp.answer or "New customer — no history."
    except Exception as e:
        return f"Profile unavailable: {e}"


async def retain_interaction(
    customer_id: str,
    customer_message: str,
    ai_response: str,
    sentiment_score: float,
    churn_risk: float,
    intent: str,
    memory_note: Optional[str] = None,
):
    """Store interaction in customer's Hindsight bank."""
    try:
        client = get_hindsight()
        content = (
            f"[{datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC]\n"
            f"Customer: {customer_message}\n"
            f"AI Agent: {ai_response}\n"
            f"Sentiment: {sentiment_score:.2f} | Churn Risk: {churn_risk:.2f} | Intent: {intent}"
        )
        if memory_note:
            content += f"\nNote: {memory_note}"

        await client.aretain(
            bank_id=_customer_bank(customer_id),
            content=content,
            tags=["interaction", intent],
        )
    except Exception as e:
        print(f"[Memory] Failed to retain interaction: {e}")


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
    """Bulk-seed historical interactions for a customer (demo only)."""
    try:
        client = get_hindsight()
        for ix in interactions:
            content = (
                f"[{ix.get('date', '2024')}]\n"
                f"Customer: {ix['customer']}\n"
                f"Resolution: {ix['resolution']}\n"
                f"Outcome: {ix.get('outcome', 'resolved')}"
            )
            await client.aretain(
                bank_id=_customer_bank(customer_id),
                content=content,
                tags=["history", ix.get("type", "support")],
            )
    except Exception as e:
        print(f"[Memory] Seed failed for {customer_id}: {e}")
