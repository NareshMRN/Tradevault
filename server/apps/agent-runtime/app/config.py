import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 8000
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/confluence")
    AGENT_RUNTIME_INTERNAL_SECRET: str = os.getenv(
        "AGENT_RUNTIME_INTERNAL_SECRET", "confluence-shared-internal-secret-token-xyz987"
    )

    # Primary LLM API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_BASE_URL: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")

    # Angel One SmartAPI (Market Data Provider)
    ANGEL_CLIENT_ID: str = os.getenv("ANGEL_CLIENT_ID", "")
    ANGEL_PIN: str = os.getenv("ANGEL_PIN", "")
    ANGEL_API_KEY: str = os.getenv("ANGEL_API_KEY", "")
    ANGEL_TOTP_SECRET: str = os.getenv("ANGEL_TOTP_SECRET", "")

    # Groww Trading API (Optional Secondary Provider)
    GROWW_API_KEY: str = os.getenv("GROWW_API_KEY", "")
    GROWW_API_SECRET: str = os.getenv("GROWW_API_SECRET", "")
    GROWW_ACCESS_TOKEN: str = os.getenv("GROWW_ACCESS_TOKEN", "")
    GROWW_TOTP_SECRET: str = os.getenv("GROWW_TOTP_SECRET", "")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Master Role Assignment Mapping (Gemini + Groq GPT committee)
AGENT_MODEL_MAPPING = {
    # Gemini Roles: Fundamentals, News summary, Bull vs Bear debate, Multilingual
    "fundamentals_analyst": {"provider": "gemini", "model": settings.GEMINI_MODEL},
    "news_analyst":         {"provider": "gemini", "model": settings.GEMINI_MODEL},
    "bull_researcher":      {"provider": "gemini", "model": settings.GEMINI_MODEL},
    "bear_researcher":      {"provider": "gemini", "model": settings.GEMINI_MODEL},
    "multilingual_synthesis": {"provider": "gemini", "model": settings.GEMINI_MODEL},

    # Groq GPT Roles: Second opinion, Social sentiment, Risk Manager, Portfolio Manager
    "technical_analyst":    {"provider": "groq",   "model": settings.GROQ_MODEL},
    "sentiment_analyst":    {"provider": "groq",   "model": settings.GROQ_MODEL},
    "trader":               {"provider": "groq",   "model": settings.GROQ_MODEL},
    "risk_manager":         {"provider": "groq",   "model": settings.GROQ_MODEL},
    "portfolio_manager":    {"provider": "groq",   "model": settings.GROQ_MODEL},

    # Fallback Chain
    "fallback_chain": {
        "gemini": "groq",
        "groq": "gemini",
    },
}
