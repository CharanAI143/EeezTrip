import pytest

from backend.app.providers.ai.factory import (
    AIProviderFactory,
    BaseLLMProvider,
    GeminiProvider,
    OllamaProvider,
    OpenRouterProvider,
    UnavailableProvider,
)


def test_parse_json_object_handles_markdown_fence():
    raw = 'Here is your itinerary:\n```json\n{"title": "Bali"}\n```\nEnjoy!'
    assert BaseLLMProvider.parse_json_object(raw) == {"title": "Bali"}


def test_parse_json_object_handles_surrounding_prose():
    raw = 'Sure thing! {"title": "Paris", "days": 3} Hope this helps.'
    assert BaseLLMProvider.parse_json_object(raw) == {"title": "Paris", "days": 3}


def test_parse_json_object_accepts_bare_json():
    assert BaseLLMProvider.parse_json_object('{"ok": true}') == {"ok": True}


def test_parse_json_object_unwraps_single_element_list():
    assert BaseLLMProvider.parse_json_object('[{"a": 1}]') == {"a": 1}


def test_parse_json_object_raises_on_undecodable_text():
    with pytest.raises(ValueError):
        BaseLLMProvider.parse_json_object("I cannot help with that request.")


def test_factory_returns_real_providers():
    assert isinstance(AIProviderFactory.get_provider("gemini"), GeminiProvider)
    assert isinstance(AIProviderFactory.get_provider("ollama"), OllamaProvider)
    assert isinstance(AIProviderFactory.get_provider("openrouter"), OpenRouterProvider)


def test_factory_falls_back_to_unavailable_for_unknown_provider():
    assert isinstance(AIProviderFactory.get_provider("not-a-provider"), UnavailableProvider)
    assert AIProviderFactory.get_provider("not-a-provider").is_available() is False


def test_provider_chain_is_deduplicated_and_ordered():
    chain = AIProviderFactory.provider_chain(["gemini", "gemini", "ollama"])
    assert chain == ["gemini", "ollama"]


def test_provider_chain_drops_unknown_providers():
    assert AIProviderFactory.provider_chain(["bogus"]) == []


def test_availability_requires_credentials(monkeypatch):
    monkeypatch.setattr("backend.app.core.config.settings.GEMINI_API_KEY", "")
    monkeypatch.setattr("backend.app.core.config.settings.OPENROUTER_API_KEY", "")
    assert GeminiProvider().is_available() is False
    assert OpenRouterProvider().is_available() is False


def test_unavailable_provider_raises_on_generate():
    with pytest.raises(RuntimeError):
        UnavailableProvider().generate_text("hello")
