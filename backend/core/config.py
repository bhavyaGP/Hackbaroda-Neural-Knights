import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    HINDSIGHT_BASE_URL: str = os.getenv("HINDSIGHT_BASE_URL", "https://api.hindsight.vectorize.io")
    HINDSIGHT_API_KEY: str = os.getenv("HINDSIGHT_API_KEY", "")
    DEEPGRAM_API_KEY: str = os.getenv("DEEPGRAM_API_KEY", "")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DATA_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    KB_BANK_ID: str = "cia_knowledge_base"
    OPENAI_MODEL: str = "gpt-4o-mini"

settings = Settings()
