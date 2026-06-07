"""
Seeds demo customers and their Hindsight memory banks.
Runs once on startup — skips if data already exists.
"""
from db.store import store
from memory.hindsight_memory import seed_customer_history
from knowledge_base.kb_service import seed_knowledge_base

DEMO_CUSTOMERS = [
    {
        "id": "C001",
        "name": "Rahul Mehta",
        "email": "rahul.mehta@techcorp.in",
        "phone": "+91-9876543210",
        "tier": "premium",
        "products": ["Analytics Pro", "Data Pipeline", "API Gateway"],
        "subscription_status": "active",
        "lifetime_value": 12400.0,
    },
    {
        "id": "C002",
        "name": "Sarah Chen",
        "email": "sarah.chen@startup.io",
        "phone": "+1-415-555-0192",
        "tier": "standard",
        "products": ["Starter Pack"],
        "subscription_status": "trial",
        "lifetime_value": 0.0,
    },
    {
        "id": "C003",
        "name": "James O'Brien",
        "email": "james@globalcorp.com",
        "phone": "+44-20-7946-0302",
        "tier": "enterprise",
        "products": ["Enterprise Suite", "Custom Integrations", "Dedicated Infrastructure", "Analytics Pro"],
        "subscription_status": "active",
        "lifetime_value": 84000.0,
    },
    {
        "id": "C004",
        "name": "Priya Sharma",
        "email": "priya.sharma@ecomm.in",
        "phone": "+91-8765432109",
        "tier": "premium",
        "products": ["Analytics Pro", "Reporting Suite"],
        "subscription_status": "active",
        "lifetime_value": 5200.0,
    },
]

CUSTOMER_HISTORIES = {
    "C001": [
        {
            "date": "2024-11-15",
            "type": "billing",
            "customer": "I was charged twice this month. This is unacceptable.",
            "resolution": "Duplicate charge confirmed and refunded within 2 days. Customer was apologized to and given 1 month free.",
            "outcome": "resolved — customer satisfied after refund",
        },
        {
            "date": "2024-12-03",
            "type": "technical",
            "customer": "The API Gateway is throwing 503 errors intermittently.",
            "resolution": "Engineering identified a load balancer misconfiguration. Fixed in 4 hours. Customer notified.",
            "outcome": "resolved — appreciated fast fix",
        },
        {
            "date": "2025-02-18",
            "type": "complaint",
            "customer": "I've been having issues for months. I'm considering switching to a competitor.",
            "resolution": "Escalated to senior support. Offered 3 months at 50% discount and dedicated account manager.",
            "outcome": "retained — customer accepted offer but expressed continued frustration",
        },
        {
            "date": "2025-04-01",
            "type": "billing",
            "customer": "Why did my bill increase by 30% without notice?",
            "resolution": "Price increase notification was sent via email but went to spam. Explained new pricing. Offered to lock current price for 6 months.",
            "outcome": "partially resolved — customer unhappy about price increase",
        },
    ],
    "C002": [],
    "C003": [
        {
            "date": "2025-01-10",
            "type": "onboarding",
            "customer": "We need help migrating 50TB of data to your platform.",
            "resolution": "Assigned dedicated migration engineer. Completed in 2 weeks with zero data loss.",
            "outcome": "resolved — excellent outcome, customer very happy",
        },
        {
            "date": "2025-03-05",
            "type": "feature",
            "customer": "We need custom SSO integration with our identity provider.",
            "resolution": "Custom SSO built and deployed in 3 weeks.",
            "outcome": "resolved — customer impressed with turnaround time",
        },
    ],
    "C004": [
        {
            "date": "2025-05-20",
            "type": "complaint",
            "customer": "Reports are taking 10 minutes to generate. This is making our team unproductive.",
            "resolution": "Performance issue escalated. Temporary workaround provided. Full fix ETA 1 week.",
            "outcome": "in progress — customer waiting for fix",
        },
        {
            "date": "2025-06-01",
            "type": "refund",
            "customer": "I want a refund for last month. The performance issues cost us a major client.",
            "resolution": "Partial refund of 50% offered pending full investigation.",
            "outcome": "pending — customer considering options",
        },
    ],
}


async def seed_database():
    existing = store.list_customers()
    if existing:
        print(f"[Seed] {len(existing)} customers already in store — skipping customer seed.")
    else:
        print("[Seed] Seeding demo customers...")
        for c in DEMO_CUSTOMERS:
            store.upsert_customer(c)
        print(f"[Seed] Created {len(DEMO_CUSTOMERS)} customers.")

        print("[Seed] Seeding customer memory banks in Hindsight...")
        for cid, history in CUSTOMER_HISTORIES.items():
            if history:
                await seed_customer_history(cid, history)
        print("[Seed] Customer memories seeded.")

    print("[Seed] Seeding knowledge base...")
    await seed_knowledge_base()
    print("[Seed] Done.")
