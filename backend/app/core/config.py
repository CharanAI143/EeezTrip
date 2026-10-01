import os
from typing import List
from pydantic import BaseModel

class Settings(BaseModel):
    """Centralized application settings loaded from environment variables."""
    PROJECT_NAME: str = "EeezTrip API v2"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    MONGODB_URI: str = os.getenv("MONGODB_URI", "")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "eeeztrip")
    
    # AI Providers
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    # gemini-2.5-flash and gemini-2.0-flash are retired for new projects and
    # answer 404, so the default is the lite tier, which is still open.
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")
    # Any OpenAI-compatible /chat/completions endpoint (Groq, Cerebras,
    # Together, Fireworks, a self-hosted vLLM, ...). Left empty it stays dormant.
    OPENAI_COMPATIBLE_BASE_URL: str = os.getenv("OPENAI_COMPATIBLE_BASE_URL", "")
    OPENAI_COMPATIBLE_API_KEY: str = os.getenv("OPENAI_COMPATIBLE_API_KEY", "")
    OPENAI_COMPATIBLE_MODEL: str = os.getenv("OPENAI_COMPATIBLE_MODEL", "")
    # Groq is the common case, so it gets a preset base URL: setting only
    # GROQ_API_KEY is enough to switch the fallback on.
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_BASE_URL: str = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
    # The model catalogue is account-specific, so this is only a guess. A model
    # the key cannot see fails fast with 404 and the chain moves on; set
    # GROQ_MODEL to something from https://console.groq.com/docs/models.
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    # Voice transcription on Groq's free tier. This is what keeps the mic
    # working when the paid OpenAI key is out of credit.
    GROQ_TRANSCRIBE_MODEL: str = os.getenv("GROQ_TRANSCRIBE_MODEL", "whisper-large-v3-turbo")
    OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    DEEP_MODE_TIMEOUT_SEC: int = int(os.getenv("DEEP_MODE_TIMEOUT_SEC", "30"))
    AI_REQUEST_TIMEOUT_SEC: int = int(os.getenv("AI_REQUEST_TIMEOUT_SEC", "90"))
    AI_TEMPERATURE: float = float(os.getenv("AI_TEMPERATURE", "0.5"))
    
    # External APIs
    SERPAPI_API_KEY: str = os.getenv("SERPAPI_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Security & CORS
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")

    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip().rstrip("/") for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
