from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from seed_data import seed_database
from routers import chat, dashboard, customers


@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_database()
    yield


app = FastAPI(
    title="CIA — Customer Intelligence Agent",
    description="AI-powered customer support with long-term memory, multi-agent orchestration, and owner intervention.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "CIA — Customer Intelligence Agent",
        "version": "1.0.0",
    }
