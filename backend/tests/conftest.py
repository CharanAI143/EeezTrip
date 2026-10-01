import sys
from pathlib import Path

import pytest

# Add project root and backend dir to sys.path for test runner
root_dir = Path(__file__).resolve().parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent

if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))


# Credentials the providers read. Clearing them makes every provider report
# itself unavailable, which is the mode the deterministic fallbacks are built
# for. Tests that want a specific provider set its own value with monkeypatch,
# and that still wins because this fixture runs first.
_PROVIDER_CREDENTIALS = (
    "GEMINI_API_KEY",
    "GROQ_API_KEY",
    "OPENROUTER_API_KEY",
    "OPENAI_API_KEY",
    "OPENAI_COMPATIBLE_API_KEY",
    "OPENAI_COMPATIBLE_BASE_URL",
    "OPENAI_COMPATIBLE_MODEL",
)


@pytest.fixture(autouse=True)
def _no_live_providers(request):
    """Stop the suite from calling real paid models.

    Without this, whichever provider happens to answer decides whether a test
    passes: an LLM stubbing out only Gemini still falls through to Groq, and
    assertions written against the deterministic fallback then fail on live
    output. Credentials are cleared rather than ``is_available`` patched, so the
    provider classes still compute availability themselves.
    """
    if request.node.get_closest_marker("allow_live_providers"):
        return

    from backend.app.core.config import settings

    saved = {name: getattr(settings, name) for name in _PROVIDER_CREDENTIALS}
    for name in _PROVIDER_CREDENTIALS:
        setattr(settings, name, "")

    # Point Ollama at a closed port so the probe fails immediately instead of
    # reaching a developer's local model, which would make results depend on
    # whatever happens to be installed.
    saved_ollama = settings.OLLAMA_BASE_URL
    settings.OLLAMA_BASE_URL = "http://127.0.0.1:1"

    yield

    for name, value in saved.items():
        setattr(settings, name, value)
    settings.OLLAMA_BASE_URL = saved_ollama
