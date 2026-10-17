import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PORT: int = 8000
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/confluence")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    AGENT_RUNTIME_INTERNAL_SECRET: str = os.getenv(
        "AGENT_RUNTIME_INTERNAL_SECRET", "confluence-shared-internal-secret-token-xyz987"
    )

    # API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    AGENT_ROUTER_API_KEY: str = os.getenv("AGENT_ROUTER_API_KEY", "")

    # Groww Trading API
    GROWW_API_KEY: str = os.getenv("GROWW_API_KEY", "")
    GROWW_API_SECRET: str = os.getenv("GROWW_API_SECRET", "")
    GROWW_ACCESS_TOKEN: str = os.getenv("GROWW_ACCESS_TOKEN", "")
    GROWW_TOTP_SECRET: str = os.getenv("GROWW_TOTP_SECRET", "")

    # Role Model Assignments (Active Provider Catalogs)
    GROQ_REASONING_MODEL: str = "llama-3.3-70b-versatile"
    GEMINI_MODEL: str = "gemini-2.0-flash"
    MISTRAL_MODEL: str = "mistral-large-latest"
    NVIDIA_MODEL: str = "meta/llama-3.3-70b-instruct"
    OPENROUTER_MODEL: str = "deepseek/deepseek-chat"

    # Agent Router Models
    AGENT_ROUTER_TRADER_MODEL: str = "deepseek-v4-flash"
    AGENT_ROUTER_RISK_MANAGER_MODEL: str = "claude-opus-4.8"
    AGENT_ROUTER_PORTFOLIO_MANAGER_MODEL: str = "gpt-6-astra"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Master Role Assignment Mapping
AGENT_MODEL_MAPPING = {
    # Analysts
    "fundamentals_analyst": {"provider": "gemini", "model": settings.GEMINI_MODEL},
    "sentiment_analyst":    {"provider": "gemini", "model": settings.GEMINI_MODEL},
    "technical_analyst":    {"provider": "groq",   "model": settings.GROQ_REASONING_MODEL},
    "macro_analyst":        {"provider": "nvidia", "model": settings.NVIDIA_MODEL},
    "news_analyst":         {"provider": "mistral","model": settings.MISTRAL_MODEL},

    # Researchers Debate
    "bull_researcher":      {"provider": "groq",   "model": settings.GROQ_REASONING_MODEL},
    "bear_researcher":      {"provider": "groq",   "model": settings.GROQ_REASONING_MODEL},

    # Decision Core (Agent Router)
    "trader":               {"provider": "agent_router", "model": settings.AGENT_ROUTER_TRADER_MODEL},
    "risk_manager":         {"provider": "agent_router", "model": settings.AGENT_ROUTER_RISK_MANAGER_MODEL},
    "portfolio_manager":    {"provider": "agent_router", "model": settings.AGENT_ROUTER_PORTFOLIO_MANAGER_MODEL},

    # Universal Fallback
    "fallback_provider":    "openrouter",
}
