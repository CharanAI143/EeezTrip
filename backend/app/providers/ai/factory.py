import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple, Type

import requests

from backend.app.core.config import settings
from backend.app.providers.ai.base import BaseAIProvider

_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)


class BaseLLMProvider(BaseAIProvider):
    """Shared HTTP/LLM plumbing: timeout, JSON recovery, and error normalisation."""

    name = "llm"

    def _timeout(self) -> int:
        return max(5, settings.AI_REQUEST_TIMEOUT_SEC)

    def generate_structured_json(self, prompt: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        raw = self.generate_text(prompt)
        if not raw:
            raise ValueError(f"{self.name} returned an empty response")
        return self.parse_json_object(raw)

    @staticmethod
    def parse_json_object(raw_text: str) -> Dict[str, Any]:
        """Extract the first JSON object from a model response, tolerating prose and fences."""
        candidates: List[str] = []

        fenced = _JSON_FENCE.findall(raw_text or "")
        candidates.extend(block.strip() for block in fenced)

        stripped = (raw_text or "").strip()
        candidates.append(stripped)

        start = stripped.find("{")
        end = stripped.rfind("}")
        if start != -1 and end > start:
            candidates.append(stripped[start : end + 1])

        for candidate in candidates:
            if not candidate:
                continue
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed
            if isinstance(parsed, list) and parsed and isinstance(parsed[0], dict):
                return parsed[0]

        raise ValueError("Model response did not contain a decodable JSON object")


class GeminiProvider(BaseLLMProvider):
    """Google Gemini provider using the v1beta REST API with structured JSON output."""

    name = "gemini"

    _BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

    def is_available(self) -> bool:
        return bool(settings.GEMINI_API_KEY)

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        if not self.is_available():
            raise RuntimeError("GEMINI_API_KEY is not configured")

        payload: Dict[str, Any] = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": settings.AI_TEMPERATURE,
                "responseMimeType": "application/json",
            },
        }
        if system_instruction:
            payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}

        response = requests.post(
            f"{self._BASE_URL}/{settings.GEMINI_MODEL}:generateContent",
            params={"key": settings.GEMINI_API_KEY},
            json=payload,
            timeout=self._timeout(),
        )
        if response.status_code == 429:
            raise RuntimeError("Gemini rate limit exceeded")
        if response.status_code >= 400:
            raise RuntimeError(f"Gemini request failed with status {response.status_code}")

        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            block_reason = data.get("promptFeedback", {}).get("blockReason")
            if block_reason:
                raise RuntimeError(f"Gemini blocked the prompt: {block_reason}")
            raise RuntimeError("Gemini returned no candidates")

        parts = (candidates[0].get("content") or {}).get("parts") or []
        text = "".join(part.get("text", "") for part in parts).strip()
        if not text:
            raise RuntimeError("Gemini returned an empty completion")
        return text


class OllamaProvider(BaseLLMProvider):
    """Local Ollama provider with lightweight availability probing."""

    name = "ollama"

    # Shared across instances: the factory builds a new provider per request, so
    # an instance-level cache would re-probe Ollama on every call.
    _probe_cache: Dict[str, Tuple[float, Optional[str]]] = {}
    _PROBE_TTL_SEC = 60

    def __init__(self) -> None:
        self._base_url = settings.OLLAMA_BASE_URL.rstrip("/")

    def _resolved_model(self) -> Optional[str]:
        return self._probe_model()

    def is_available(self) -> bool:
        return self._probe_model() is not None

    def _probe_model(self, force: bool = False) -> Optional[str]:
        now = time.monotonic()
        cached = self._probe_cache.get(self._base_url)
        if not force and cached and (now - cached[0]) < self._PROBE_TTL_SEC:
            return cached[1]

        model: Optional[str] = None
        try:
            response = requests.get(f"{self._base_url}/api/tags", timeout=2)
            if response.status_code == 200:
                names = [
                    item.get("name", "")
                    for item in ((response.json() or {}).get("models") or [])
                    if isinstance(item, dict)
                ]
                preferred = settings.OLLAMA_MODEL.strip()
                if preferred in names:
                    model = preferred
                elif names:
                    model = names[0]
        except Exception:
            model = None

        self._probe_cache[self._base_url] = (now, model)
        return model

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        if not self.is_available():
            raise RuntimeError("No Ollama model is available locally")

        messages: List[Dict[str, str]] = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        response = requests.post(
            f"{self._base_url}/api/chat",
            json={
                "model": self._resolved_model() or settings.OLLAMA_MODEL,
                "messages": messages,
                "format": "json",
                "stream": False,
                "options": {"temperature": settings.AI_TEMPERATURE},
            },
            timeout=self._timeout(),
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Ollama request failed with status {response.status_code}")

        content = ((response.json() or {}).get("message") or {}).get("content", "").strip()
        if not content:
            raise RuntimeError("Ollama returned an empty completion")
        return content


class OpenRouterProvider(BaseLLMProvider):
    """OpenRouter provider acting as a cloud fallback for constrained deployments."""

    name = "openrouter"

    _BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

    def is_available(self) -> bool:
        return bool(settings.OPENROUTER_API_KEY)

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        if not self.is_available():
            raise RuntimeError("OPENROUTER_API_KEY is not configured")

        messages: List[Dict[str, str]] = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        response = requests.post(
            self._BASE_URL,
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.OPENROUTER_MODEL,
                "messages": messages,
                "temperature": settings.AI_TEMPERATURE,
                "response_format": {"type": "json_object"},
            },
            timeout=self._timeout(),
        )
        if response.status_code == 429:
            raise RuntimeError("OpenRouter rate limit exceeded")
        if response.status_code >= 400:
            raise RuntimeError(f"OpenRouter request failed with status {response.status_code}")

        choices = (response.json() or {}).get("choices") or []
        if not choices:
            raise RuntimeError("OpenRouter returned no choices")

        content = ((choices[0].get("message") or {}).get("content") or "").strip()
        if not content:
            raise RuntimeError("OpenRouter returned an empty completion")
        return content


class UnavailableProvider(BaseLLMProvider):
    """Explicitly unavailable provider, used as the factory default."""

    name = "unavailable"

    def is_available(self) -> bool:
        return False

    def generate_text(self, prompt: str, system_instruction: str = "") -> str:
        raise RuntimeError("No AI provider is configured")


class AIProviderFactory:
    """Factory for selecting and instantiating AI provider instances."""

    _providers: Dict[str, Type[BaseAIProvider]] = {
        "gemini": GeminiProvider,
        "ollama": OllamaProvider,
        "openrouter": OpenRouterProvider,
    }

    @classmethod
    def get_provider(cls, name: str = "gemini") -> BaseAIProvider:
        """Instantiate and return the named provider, or an unavailable placeholder."""
        provider_cls = cls._providers.get((name or "").strip().lower(), UnavailableProvider)
        return provider_cls()

    @classmethod
    def provider_chain(cls, preferred: Optional[List[str]] = None) -> List[str]:
        """Return provider names in fallback order, de-duplicated and availability-filtered."""
        chain = list(preferred or ["gemini", "openrouter", "ollama"])
        seen: List[str] = []
        for name in chain:
            normalised = (name or "").strip().lower()
            if normalised in cls._providers and normalised not in seen:
                seen.append(normalised)
        return seen
