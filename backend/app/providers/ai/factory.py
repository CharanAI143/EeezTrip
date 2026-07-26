from typing import Optional, Dict, Type
from backend.app.providers.ai.base import BaseAIProvider
from backend.app.core.config import settings

class DummyGeminiProvider(BaseAIProvider):
    """Placeholder Gemini Provider instance."""
    def is_available(self) -> bool:
        return bool(settings.GEMINI_API_KEY)

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        return ""

    def generate_structured_json(self, prompt: str, schema: dict) -> dict:
        return {}

class DummyOllamaProvider(BaseAIProvider):
    """Placeholder Ollama Provider instance."""
    def is_available(self) -> bool:
        return False

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        return ""

    def generate_structured_json(self, prompt: str, schema: dict) -> dict:
        return {}

class DummyOpenRouterProvider(BaseAIProvider):
    """Placeholder OpenRouter Provider instance."""
    def is_available(self) -> bool:
        return bool(settings.OPENROUTER_API_KEY)

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        return ""

    def generate_structured_json(self, prompt: str, schema: dict) -> dict:
        return {}

class AIProviderFactory:
    """Factory for selecting and instantiating AI provider instances."""
    _providers: Dict[str, Type[BaseAIProvider]] = {
        "gemini": DummyGeminiProvider,
        "ollama": DummyOllamaProvider,
        "openrouter": DummyOpenRouterProvider,
    }

    @classmethod
    def get_provider(cls, name: str = "gemini") -> BaseAIProvider:
        """Instantiate and return named provider or default fallback provider."""
        provider_cls = cls._providers.get(name.lower(), DummyGeminiProvider)
        return provider_cls()
