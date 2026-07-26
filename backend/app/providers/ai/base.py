from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseAIProvider(ABC):
    """Abstract Base Interface for AI Provider implementations."""

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider dependencies, API keys, and health checks pass."""
        pass

    @abstractmethod
    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        """Generate unstructured text response from prompt."""
        pass

    @abstractmethod
    def generate_structured_json(self, prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Generate structured JSON response adhering to schema."""
        pass
