from fastapi import APIRouter, HTTPException
from models.schemas import Customer
from db.store import store
from memory.hindsight_memory import reflect_customer_profile

router = APIRouter()


@router.get("/")
async def list_customers():
    return store.list_customers()


@router.get("/{customer_id}")
async def get_customer(customer_id: str):
    customer = store.get_customer(customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


@router.get("/{customer_id}/profile")
async def get_customer_profile(customer_id: str):
    """Full customer intelligence: profile + memory summary + tickets."""
    customer = store.get_customer(customer_id)
    if not customer:
        raise HTTPException(404, "Customer not found")

    memory_summary = await reflect_customer_profile(customer_id)
    tickets = store.get_tickets_by_customer(customer_id)
    conversations = [
        c for c in store.list_all_conversations()
        if c["customer_id"] == customer_id
    ]

    return {
        "customer": customer,
        "memory_summary": memory_summary,
        "tickets": tickets,
        "conversation_count": len(conversations),
        "conversations": conversations[-5:],
    }


@router.post("/")
async def create_customer(customer: Customer):
    existing = store.get_customer(customer.id)
    if existing:
        raise HTTPException(409, "Customer already exists")
    return store.upsert_customer(customer.model_dump())
