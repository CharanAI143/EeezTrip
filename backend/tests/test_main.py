import pytest
from fastapi.testclient import TestClient
from backend.main import (
    app,
    ChatMessage,
    _CHAT_OFFLINE_REPLY,
    _CHAT_SYSTEM_INSTRUCTION,
    _flatten_for_chat,
    _looks_like_report,
    _orchestrate_chat,
)
import json

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True, "version": "2.0.0"}

def test_get_images_invalid_params():
    # 'place' is required and must be at least 2 chars
    response = client.get("/api/images?place=a")
    assert response.status_code == 422

def test_recommend_trip_normal_mode():
    # Normal mode uses build_fast_trip (template based)
    payload = {
        "origin": "Bangalore",
        "destination": "Goa",
        "mood": "Relaxed",
        "budget": 30000,
        "days": 3,
        "mode": "normal"
    }
    response = client.post("/api/recommend", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["destination"] == "Goa"
    assert "daily_plan" in data
    assert len(data["daily_plan"]) == 3

def test_chat_empty_messages():
    response = client.post("/api/chat", json={"messages": []})
    assert response.status_code == 400


def test_chat_system_instruction_forbids_interrogation_style_replies():
    # The bot used to greet with a long numbered, emoji-decorated message asking
    # for departure city, destination type, dates and budget all at once. These
    # rules are what stop that coming back.
    instruction = _CHAT_SYSTEM_INSTRUCTION.lower()

    assert "one question per reply" in instruction
    assert "never interview" in instruction
    assert "no emoji" in instruction
    assert "no numbered lists" in instruction
    assert "two short sentences" in instruction
    # Must not re-introduce the multi-deliverable promise.
    assert "never bundle future deliverables" in instruction


def test_chat_offline_reply_asks_only_one_question():
    # The offline fallback used to ask for destination, budget and trip length.
    assert _CHAT_OFFLINE_REPLY.count("?") == 1
    assert "budget" not in _CHAT_OFFLINE_REPLY.lower()
    assert "trip length" not in _CHAT_OFFLINE_REPLY.lower()


def test_looks_like_report_flags_report_style_replies():
    report = (
        "| Item | Cost |\n|------|------|\n| Flight | 30000 |\n"
        "**Bold header** and **more bold** text here."
    )
    assert _looks_like_report(report) is True
    assert _looks_like_report("1. First thing\n2. Second thing") is True
    assert _looks_like_report("x" * 700) is True
    # A normal conversational turn must pass through untouched.
    assert _looks_like_report("Where are you thinking of going?") is False
    assert _looks_like_report("Kerala in five days costs about 20k rupees. Want beaches?") is False


def test_flatten_for_chat_has_no_competing_system_heading():
    # Two "System:" blocks in one prompt let the model pick the report-style
    # one and ignore the conversational rules.
    flattened = _flatten_for_chat([{"role": "user", "content": "Hello"}])
    assert "System:" not in flattened
    assert flattened.endswith("Assistant:")
    assert "User: Hello" in flattened


def test_chat_context_is_not_inlined_as_a_transcript_message():
    # Context must reach the model only via the real system instruction, so it
    # cannot act as a formatting example.
    captured = {}

    class FakeProvider:
        def is_available(self):
            return True

        def generate_text(self, prompt, system_instruction=None, json_mode=False):
            captured["prompt"] = prompt
            captured["system"] = system_instruction or ""
            return "Where are you thinking of going?"

    class FakeFactory:
        @staticmethod
        def provider_chain():
            return ["fake"]

        @staticmethod
        def get_provider(_name):
            return FakeProvider()

    monkey = pytest.MonkeyPatch()
    monkey.setattr(
        "backend.app.providers.ai.factory.AIProviderFactory", FakeFactory, raising=True
    )
    try:
        reply = _orchestrate_chat(
            [
                ChatMessage(role="system", content="Internal reference: origin Bengaluru, 5 days."),
                ChatMessage(role="user", content="Hello"),
            ]
        )
    finally:
        monkey.undo()

    assert reply == "Where are you thinking of going?"
    # The system instruction is the only place the context appears.
    assert "origin Bengaluru" in captured["system"]
    assert "origin Bengaluru" not in captured["prompt"]
    assert "System:" not in captured["prompt"]
    # And the format contract survives the merge.
    assert "ONE question per reply" in captured["system"]

def test_db_status_disconnected():
    # Assuming MongoDB is not connected in the test environment
    response = client.get("/api/db/status")
    assert response.status_code == 200
    data = response.json()
    assert "connected" in data

if __name__ == "__main__":
    pytest.main([__file__])
