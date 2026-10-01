import asyncio

import pytest

from backend.app.schemas.concierge import ConciergeRequest, IntentType
from backend.app.services.intent_engine import IntentEngine


class _StubIntelligence:
    def __init__(self, summary=None):
        self._summary = summary or {"temp_max": 30, "temp_min": 22, "is_rainy": False, "condition": "Clear"}

    def get_intelligence(self, destination):
        class _Result:
            def __init__(self, weather_summary):
                self.weather_summary = weather_summary
                self.insights = []

        return _Result(self._summary)


class _StubSession:
    def get_context(self, session_data):
        return "SESSION CONTEXT"


def _engine(monkeypatch, provider_map):
    engine = IntentEngine()
    monkeypatch.setattr(engine, "intelligence_service", _StubIntelligence())
    monkeypatch.setattr(engine, "session_service", _StubSession())

    def fake_get_provider(name):
        class _Provider:
            def __init__(self, key):
                self._key = key

            def is_available(self):
                return self._key in provider_map

            def generate_text(self, prompt, system_instruction="", json_mode=True):
                # The concierge reply is shown verbatim, so JSON mode must be off.
                assert json_mode is False, "concierge replies must not request JSON"
                value = provider_map[self._key]
                if isinstance(value, Exception):
                    raise value
                return value

        return _Provider(name)

    monkeypatch.setattr("backend.app.services.intent_engine.AIProviderFactory.get_provider", fake_get_provider)
    return engine


@pytest.mark.asyncio
async def test_general_query_uses_llm_reply(monkeypatch):
    engine = _engine(monkeypatch, {"gemini": "Paris is lovely in spring."})
    res = await engine.process_query(ConciergeRequest(query="Tell me something inspiring about travel"))

    assert res.reply == "Paris is lovely in spring."
    assert res.detected_intent == IntentType.GENERAL_TRAVEL_ADVICE
    assert res.action_taken == "LLM Contextual Reasoning"


@pytest.mark.asyncio
async def test_llm_failure_falls_back_to_deterministic_reply(monkeypatch):
    engine = _engine(monkeypatch, {"gemini": RuntimeError("upstream 500")})
    res = await engine.process_query(ConciergeRequest(query="Tell me something inspiring about travel"))

    assert "Goa" in res.reply
    assert res.action_taken == "Deterministic Travel Assistant Response"


@pytest.mark.asyncio
async def test_no_provider_available_falls_back(monkeypatch):
    engine = _engine(monkeypatch, {})
    res = await engine.process_query(ConciergeRequest(query="Tell me something inspiring about travel"))

    assert res.action_taken == "Deterministic Travel Assistant Response"


@pytest.mark.asyncio
async def test_trip_question_reads_from_session_not_llm(monkeypatch):
    called = {"llm": False}
    engine = _engine(monkeypatch, {"gemini": "LLM SHOULD NOT BE CALLED"})

    def spy(*args, **kwargs):
        called["llm"] = True
        return ""

    monkeypatch.setattr("backend.app.services.intent_engine.AIProviderFactory.get_provider", spy)

    res = await engine.process_query(
        ConciergeRequest(query="What is my itinerary summary?"),
        session_data={"current_itinerary": {"title": "Kerala", "destination": "Kerala", "summary": "Backwaters"}},
    )

    assert called["llm"] is False
    assert res.detected_intent == IntentType.TRIP_QUESTION
    assert "Backwaters" in res.reply


@pytest.mark.asyncio
async def test_weather_intent_uses_intelligence_service(monkeypatch):
    engine = _engine(monkeypatch, {"gemini": "unused"})
    res = await engine.process_query(
        ConciergeRequest(query="What is the weather in Bali?"),
        session_data={"preferences": {"destination": "Bali"}},
    )

    assert res.detected_intent == IntentType.WEATHER_QUESTION
    assert res.metadata["destination"] == "Bali"


@pytest.mark.asyncio
async def test_llm_call_does_not_block_event_loop(monkeypatch):
    """A slow provider must not stall other coroutines on the loop."""
    engine = _engine(monkeypatch, {})

    def slow_generate(self, prompt, system_instruction=""):
        import time
        time.sleep(0.4)
        return "slow but valid reply"

    def fake_get_provider(name):
        class _Provider:
            def is_available(self):
                return True

            def generate_text(self, prompt, system_instruction="", json_mode=True):
                return slow_generate(None, prompt)

        return _Provider()

    monkeypatch.setattr("backend.app.services.intent_engine.AIProviderFactory.get_provider", fake_get_provider)

    ticks = {"n": 0}

    async def ticker():
        while True:
            await asyncio.sleep(0.02)
            ticks["n"] += 1

    task = asyncio.create_task(ticker())
    start = asyncio.get_event_loop().time()
    res = await engine.process_query(ConciergeRequest(query="Tell me something inspiring"))
    elapsed = asyncio.get_event_loop().time() - start
    task.cancel()

    assert res.reply == "slow but valid reply"
    assert elapsed >= 0.4
    assert ticks["n"] > 5, "event loop was blocked during the LLM call"
