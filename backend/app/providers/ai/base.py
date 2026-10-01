from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAIProvider(ABC):
    """Abstract Base Interface for AI Provider implementations."""

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider dependencies, API keys, and health checks pass."""
        pass

    @abstractmethod
    def generate_text(
        self, prompt: str, system_instruction: str = "", json_mode: bool = True
    ) -> str:
        """Generate unstructured text response from prompt.

        ``json_mode`` asks the provider for a JSON object. It must be off for
        conversational chat, where the reply is shown verbatim.
        """
        pass

    @abstractmethod
    def generate_structured_json(self, prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Generate structured JSON response adhering to schema."""
        pass
