"""Shared fetch helper for third-party scraping endpoints.

Centralises timeout, retry and error normalisation so every provider in
``backend.main`` behaves consistently instead of each open-coding ``requests``.
"""

import re
import threading
import time
from typing import Any, Callable, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import requests

DEFAULT_TIMEOUT_SEC = 10
MAX_ATTEMPTS = 2
RETRY_BACKOFF_SEC = 0.4

# A trip request fires eight of these lookups at once to enrich an estimate
# that already has a deterministic fallback. When the upstream is slow or
# blocked, every one of them sits on its own timeout and the user waits tens of
# seconds for data that is optional. Once a host has failed this many times,
# stop paying for it until the cooldown passes.
CIRCUIT_FAIL_THRESHOLD = 2
CIRCUIT_OPEN_SEC = 60.0

_circuit_lock = threading.Lock()
_failing_hosts: Dict[str, List[float]] = {}


def _host_of(url: str) -> str:
    return urlparse(url).netloc or url


def _circuit_is_open(url: str) -> bool:
    now = time.monotonic()
    host = _host_of(url)
    with _circuit_lock:
        stamps = [t for t in _failing_hosts.get(host, []) if now - t < CIRCUIT_OPEN_SEC]
        if stamps:
            _failing_hosts[host] = stamps
            return len(stamps) >= CIRCUIT_FAIL_THRESHOLD
        _failing_hosts.pop(host, None)
    return False


def _record_failure(url: str) -> None:
    host = _host_of(url)
    with _circuit_lock:
        _failing_hosts.setdefault(host, []).append(time.monotonic())


def reset_circuits() -> None:
    """Forget every tripped circuit. For tests and explicit operator resets."""
    with _circuit_lock:
        _failing_hosts.clear()

_PRICE_PATTERNS = (
    re.compile(r"(?:₹|INR|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{3,7})", re.IGNORECASE),
    re.compile(r"([0-9]{1,3}(?:,[0-9]{3})*)\s*(?:INR|₹)", re.IGNORECASE),
)


def fetch_with_retry(
    url: str,
    params: Optional[Dict[str, Any]] = None,
    timeout: int = DEFAULT_TIMEOUT_SEC,
    attempts: int = MAX_ATTEMPTS,
) -> Optional[Dict[str, Any]]:
    """GET JSON with one retry. Returns ``None`` instead of raising."""
    if _circuit_is_open(url):
        return None

    for attempt in range(attempts):
        try:
            response = requests.get(url, params=params, timeout=timeout)
            response.raise_for_status()
            return response.json()
        except Exception as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            # 4xx other than rate limiting will not succeed on retry.
            if status and 400 <= status < 500 and status != 429:
                print(f"[HTTP] {url} returned {status}; not retrying.")
                return None
            if attempt < attempts - 1:
                time.sleep(RETRY_BACKOFF_SEC * (attempt + 1))

    _record_failure(url)
    return None


def extract_snippets(data: Dict[str, Any], limit: int = 3) -> List[str]:
    """Collect answer-box and organic snippets from a SerpApi payload."""
    snippets: List[str] = []
    answer_box = data.get("answer_box")
    if isinstance(answer_box, dict) and answer_box.get("snippet"):
        snippets.append(str(answer_box["snippet"]))
    for result in (data.get("organic_results") or [])[:limit]:
        if isinstance(result, dict) and result.get("snippet"):
            snippets.append(str(result["snippet"]))
    return snippets


def extract_price(snippet: str) -> Optional[int]:
    """Pull the first INR price out of a snippet, tolerating currency suffixes."""
    clean = re.sub(r"\s+", " ", snippet or "").strip()
    for pattern in _PRICE_PATTERNS:
        match = pattern.search(clean)
        if match:
            try:
                return int(match.group(1).replace(",", ""))
            except ValueError:
                continue
    return None


def first_organic_link(data: Dict[str, Any], default: str) -> str:
    """Return the first organic result link, or ``default``."""
    for result in (data.get("organic_results") or []):
        if isinstance(result, dict) and result.get("link"):
            return str(result["link"])
    return default


def serpapi_search(
    query: str,
    api_key: str,
    engine: str = "google",
    timeout: int = DEFAULT_TIMEOUT_SEC,
) -> Optional[Dict[str, Any]]:
    """Run a SerpApi google search. Returns ``None`` when unavailable or failing."""
    if not api_key:
        return None
    return fetch_with_retry(
        "https://serpapi.com/search.json",
        params={"engine": engine, "q": query, "api_key": api_key},
        timeout=timeout,
    )
