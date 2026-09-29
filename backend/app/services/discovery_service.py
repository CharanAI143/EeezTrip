"""Destination discovery: mood picks, seasonal picks, and voice-form extraction.

All three run through the same provider chain as trip generation, and all three
degrade to deterministic curated data when no provider is configured. The
frontend keeps its own fallbacks, so these endpoints are an upgrade rather than
a dependency.
"""

import re
from typing import Any, Dict, List, Optional

from backend.app.core.config import settings
from backend.app.schemas.discovery import (
    ExtractedTripData,
    MoodChoice,
    MoodRequest,
    SeasonalData,
    SeasonalDestination,
    SeasonalRequest,
    VoiceExtractRequest,
)
from backend.app.services.ai_orchestrator import AIOrchestrator

_JSON_ONLY = (
    "Reply with a single valid JSON object and nothing else. No prose, no "
    "markdown fences, no explanation."
)

# Curated, broadly-true editorial copy. Per-trip cost and weather still come
# from the API; these are only what the picker needs before a plan exists.
_MOOD_CATALOGUE: Dict[str, List[Dict[str, Any]]] = {
    "relaxed": [
        {"name": "Udaipur", "description": "Lakeside palaces, slow boat mornings and quiet courtyards.", "whyMatch": "Nothing here demands an alarm clock.", "estimatedCost": 18000, "landscapeType": "city", "highlight": "Lake Pichola at sunrise"},
        {"name": "Coorg", "description": "Coffee estates and rainforest walks in the Western Ghats.", "whyMatch": "Green, cool and genuinely unhurried.", "estimatedCost": 15000, "landscapeType": "mountain", "highlight": "Coffee estate stays"},
        {"name": "Varkala", "description": "Cliff-top shacks, red Laterite cliffs and long empty beaches.", "whyMatch": "Built for doing very little, well.", "estimatedCost": 12000, "landscapeType": "beach", "highlight": "Kovalam sunsets"},
    ],
    "romantic": [
        {"name": "Udaipur", "description": "A lake ringed by palaces, best at dusk when the aarti lamps come on.", "whyMatch": "Two people, one boat, no itinerary pressure.", "estimatedCost": 20000, "landscapeType": "city", "highlight": "City Palace light show"},
        {"name": "Munnar", "description": "Tea slopes and mist-filled valleys in the Kerala highlands.", "whyMatch": "Cool evenings and cloud you can actually see.", "estimatedCost": 16000, "landscapeType": "mountain", "highlight": "Top Station viewpoint"},
        {"name": "Havelock", "description": "Quiet islands, clear shallows and reef snorkelling off Andaman.", "whyMatch": "A short flight from the mainland, far from everything.", "estimatedCost": 22000, "landscapeType": "beach", "highlight": "Radhanagar Beach"},
    ],
    "adventurous": [
        {"name": "Manali", "description": "River crossings, high passes and ridgelines above the clouds.", "whyMatch": "Every day has a physical objective.", "estimatedCost": 17000, "landscapeType": "mountain", "highlight": "Hampta Pass trek"},
        {"name": "Rishikesh", "description": "Whitewater rafting, cliff jumping and Himalayan trails.", "whyMatch": "Adrenaline with a riverside town to reset in.", "estimatedCost": 14000, "landscapeType": "mountain", "highlight": "River rafting at Shivpuri"},
        {"name": "Spiti Valley", "description": "High-altitude deserts, monasteries and frozen river crossings.", "whyMatch": "Nowhere else in India looks like this.", "estimatedCost": 19000, "landscapeType": "mountain", "highlight": "Chandratal Lake"},
    ],
    "nature": [
        {"name": "Kerala", "description": "Backwater houseboats, tea estates and the Western Ghats.", "whyMatch": "Green corridors from coast to hill station.", "estimatedCost": 19000, "landscapeType": "mountain", "highlight": "Periyar wildlife cruise"},
        {"name": "Ranthambore", "description": "Dry forest, lakes and tiger habitat in Rajasthan.", "whyMatch": "Wildlife done properly, with expert guides.", "estimatedCost": 16000, "landscapeType": "mountain", "highlight": "Dawn safari zones"},
        {"name": "Andaman", "description": "Rainforest islands, limestone caves and untouched reef.", "whyMatch": "The clearest water in India.", "estimatedCost": 24000, "landscapeType": "beach", "highlight": "Baratang Island caves"},
    ],
    "foodie": [
        {"name": "Amritsar", "description": "Langar kitchens, kulcha stalls and the Golden Temple's own langar.", "whyMatch": "A city that is organised around feeding people.", "estimatedCost": 9000, "landscapeType": "city", "highlight": "Kulcha crawl on Food Street"},
        {"name": "Jaipur", "description": "Old-city bazaars, rooftop kitchens and Rajasthani thalis.", "whyMatch": "Dense, walkable and loud in all the right ways.", "estimatedCost": 12000, "landscapeType": "city", "highlight": "Johari Bazaar spices"},
        {"name": "Kochi", "description": "Spice markets, toddy shops and backwater seafood kitchens.", "whyMatch": "Malabari cooking with the produce in front of you.", "estimatedCost": 15000, "landscapeType": "beach", "highlight": "Mattancherry spice market"},
    ],
}

_SEASONAL_CATALOGUE: Dict[str, List[Dict[str, Any]]] = {
    "nearby": [
        {"name": "Coorg", "description": "Coffee estates and cool ridge walks a few hours inland.", "highlight": "Estate tours in the rains", "type": "nature"},
        {"name": "Hampi", "description": "Ruined Vijayanagara stonework on a boulder riverbed.", "highlight": "Winter temple walks", "type": "culture"},
        {"name": "Gokarna", "description": "Coastal Karnataka beaches and cliff walks.", "highlight": "Off-season beach solitude", "type": "beach"},
    ],
    "national": [
        {"name": "Rishikesh", "description": "Himalayan foothills with rafting and ashram towns.", "highlight": "Summer river camps", "type": "nature"},
        {"name": "Jaipur", "description": "Pink City landmarks and a dense old-city food scene.", "highlight": "Monsoon haze over Amber Fort", "type": "culture"},
        {"name": "Andaman", "description": "Reef islands with the best diving window of the year.", "highlight": "Clear-water season", "type": "beach"},
    ],
    "global": [
        {"name": "Kyoto", "description": "Temple districts that are at their best in the shoulder months.", "highlight": "Autumn maple colour", "type": "culture"},
        {"name": "Santorini", "description": "Cycladic villages out of the summer crowds.", "highlight": "Late-season sunsets", "type": "beach"},
        {"name": "Swiss Alps", "description": "Glacier railways and high trails once the snow returns.", "highlight": "Early winter rail passes", "type": "nature"},
    ],
}

_START_HINTS = [
    re.compile(
        r"\b(?:from|starting|leaving|origin|departing from)\s+"
        r"([A-Za-z][A-Za-z\s]{2,30}?)(?=\s+(?:to|for|with|,|\.|in|on|$))",
        re.I,
    ),
]

# Two-word place names need an explicit leading token, otherwise "to new delhi"
# resolves to "new". Everything else captures a single token, so a trailing word
# like "to goa tomorrow" is not swallowed into the destination.
_MULTIWORD_PREFIX = r"(?:new|north|south|east|west|port|cape|san|st\.|great|kota|puri)"
_PLACE = rf"(?:{_MULTIWORD_PREFIX}\s+)?[A-Za-z][A-Za-z]{{1,24}}"

_DEST_HINTS = [
    # "to <place>", but not "to visit / to go / to travel"
    re.compile(
        rf"\bto\s+(?!visit\b|go\b|going\b|travel\b|head\b|fly\b|plan\b|trip\b)"
        rf"({_PLACE})(?=\s|,|\.|$)",
        re.I,
    ),
    re.compile(
        rf"\b(?:visit|visiting|go|going|travel|travelling|traveling|head|fly)\s+"
        rf"(?:to\s+)?({_PLACE})(?=\s|,|\.|$)",
        re.I,
    ),
    re.compile(
        rf"\b(?:trip|vacation|holiday|itinerary)\s+to\s+({_PLACE})(?=\s|,|\.|$)",
        re.I,
    ),
]

# "under 20000" and "20000 rupees" are both common; accept either order.
_BUDGET_HINTS = [
    re.compile(r"(?:budget|for|under|around|rs\.?|inr|₹|\$)\s*([\d][\d,]{2,})", re.I),
    re.compile(r"([\d][\d,]{2,})\s*(?:rupees|rupee|rs\.?|inr|₹|\$|dollars?)", re.I),
]
_DURATION_HINT = re.compile(r"(\d{1,2})\s*(?:day|days|night|nights)", re.I)

_MOOD_HINTS = re.compile(r"\b(relaxed?|romantic|adventur\w*|nature|foodie|food|wildlife|culture|temple)\b", re.I)


def _first_match(patterns: List[re.Pattern], text: str) -> Optional[str]:
    """First group that actually matched. Patterns are independent on purpose —
    an earlier break here meant a transcript with both an origin and a
    destination only ever produced the origin."""
    for pattern in patterns:
        match = pattern.search(text)
        if match and match.group(1):
            return match.group(1).strip()
    return None


def _titleise(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return re.sub(r"\b\w", lambda m: m.group(0).upper(), value)


def _as_int(value: Any, fallback: int = 0) -> int:
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return fallback


def _as_text(value: Any, fallback: str = "") -> str:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return fallback


class DiscoveryService:
    """Destination-discovery helpers shared by the v1 routes."""

    def __init__(self, orchestrator: Optional[AIOrchestrator] = None):
        self.orchestrator = orchestrator or AIOrchestrator()

    def _ask(self, prompt: str, timeout: int) -> Optional[Dict[str, Any]]:
        payload, provider_name = self.orchestrator._try_providers(prompt, timeout)
        if payload is not None:
            print(f"[DiscoveryService] Answer from provider '{provider_name}'.")
        return payload

    # ── mood ──────────────────────────────────────────────────────────
    def _mood_prompt(self, req: MoodRequest) -> str:
        return (
            f"Suggest {req.count} Indian travel destinations for a traveller whose mood is "
            f'"{req.mood}" and whose budget is {req.budget} {req.currency}.\n'
            "Reply as {\"choices\": [...]} where each element has keys: name, description, "
            "whyMatch, estimatedCost, landscapeType, highlight. estimatedCost must be a "
            f"number in {req.currency} for a 4-day trip. {_JSON_ONLY}"
        )

    def mood_recommendations(self, req: MoodRequest) -> List[MoodChoice]:
        payload = self._ask(self._mood_prompt(req), max(10, settings.DEEP_MODE_TIMEOUT_SEC * 3))
        choices = payload.get("choices") if isinstance(payload, dict) else None
        if isinstance(choices, list) and choices:
            cleaned = [self._clean_mood_choice(c) for c in choices if isinstance(c, dict)]
            cleaned = [c for c in cleaned if c is not None]
            if cleaned:
                return cleaned[: req.count]

        print("[DiscoveryService] Mood request fell back to the curated catalogue.")
        return self._mood_fallback(req)

    def _clean_mood_choice(self, raw: Dict[str, Any]) -> Optional[MoodChoice]:
        name = _as_text(raw.get("name"))
        if not name:
            return None
        return MoodChoice(
            name=name,
            description=_as_text(raw.get("description"), "A destination matched to your mood."),
            whyMatch=_as_text(raw.get("whyMatch") or raw.get("why_match"), "Suits the mood you picked."),
            estimatedCost=_as_int(raw.get("estimatedCost") or raw.get("estimated_cost")),
            landscapeType=_as_text(raw.get("landscapeType") or raw.get("landscape_type"), "city"),
            highlight=_as_text(raw.get("highlight")),
        )

    def _mood_fallback(self, req: MoodRequest) -> List[MoodChoice]:
        key = (req.mood or "relaxed").strip().lower()
        catalogue = _MOOD_CATALOGUE.get(key) or _MOOD_CATALOGUE["relaxed"]
        scale = max(0.4, min(2.5, req.budget / 50000)) if req.budget else 1.0
        picks: List[MoodChoice] = []
        for entry in catalogue:
            picks.append(
                MoodChoice(
                    name=entry["name"],
                    description=entry["description"],
                    whyMatch=entry["whyMatch"],
                    estimatedCost=int(entry["estimatedCost"] * scale),
                    landscapeType=entry["landscapeType"],
                    highlight=entry["highlight"],
                )
            )
        return picks[: req.count]

    # ── seasonal ──────────────────────────────────────────────────────
    def _seasonal_prompt(self, req: SeasonalRequest) -> str:
        return (
            f"Suggest seasonal destinations for a traveller near "
            f'"{req.location or "an unknown starting point"}" travelling in month {req.month}.\n'
            "Reply as {\"nearby\": [...], \"national\": [...], \"global\": [...]} where each element "
            "has keys: name, description, highlight, type. type must be one of "
            f"nature, city, beach, culture. {_JSON_ONLY}"
        )

    def seasonal_recommendations(self, req: SeasonalRequest) -> SeasonalData:
        payload = self._ask(self._seasonal_prompt(req), max(10, settings.DEEP_MODE_TIMEOUT_SEC * 3))
        if isinstance(payload, dict):
            data = SeasonalData(
                nearby=self._clean_seasonal_list(payload.get("nearby")),
                national=self._clean_seasonal_list(payload.get("national")),
                global_=self._clean_seasonal_list(payload.get("global")),
            )
            if data.nearby or data.national or data.global_:
                return data

        print("[DiscoveryService] Seasonal request fell back to the curated catalogue.")
        return SeasonalData(
            nearby=[SeasonalDestination(**e) for e in _SEASONAL_CATALOGUE["nearby"]],
            national=[SeasonalDestination(**e) for e in _SEASONAL_CATALOGUE["national"]],
            global_=[SeasonalDestination(**e) for e in _SEASONAL_CATALOGUE["global"]],
        )

    def _clean_seasonal_list(self, raw: Any) -> List[SeasonalDestination]:
        if not isinstance(raw, list):
            return []
        out: List[SeasonalDestination] = []
        for item in raw:
            if not isinstance(item, dict):
                continue
            name = _as_text(item.get("name"))
            if not name:
                continue
            kind = _as_text(item.get("type"), "culture").lower()
            if kind not in ("nature", "city", "beach", "culture"):
                kind = "culture"
            out.append(
                SeasonalDestination(
                    name=name,
                    description=_as_text(item.get("description")),
                    highlight=_as_text(item.get("highlight")),
                    type=kind,
                )
            )
        return out

    # ── voice ─────────────────────────────────────────────────────────
    def _voice_prompt(self, req: VoiceExtractRequest) -> str:
        return (
            f"Extract structured travel details from this spoken request:\n{req.transcript}\n"
            "Reply as {\"startLocation\": string|null, \"destination\": string|null, "
            "\"budget\": number|null, \"currency\": string|null, \"duration\": number|null, "
            "\"tripTypes\": string[], \"preferences\": string[]}. Use null for anything not "
            f"stated. {_JSON_ONLY}"
        )

    def voice_extract(self, req: VoiceExtractRequest) -> ExtractedTripData:
        payload = self._ask(self._voice_prompt(req), max(10, settings.DEEP_MODE_TIMEOUT_SEC * 2))
        merged = self._regex_extraction(req.transcript)
        if isinstance(payload, dict):
            for field in ("startLocation", "destination", "currency"):
                value = _as_text(payload.get(field))
                if value:
                    merged[field] = value
            budget = _as_int(payload.get("budget"), 0)
            if budget:
                merged["budget"] = budget
            duration = _as_int(payload.get("duration"), 0)
            if duration:
                merged["duration"] = duration
            for field in ("tripTypes", "preferences"):
                value = payload.get(field)
                if isinstance(value, list) and value:
                    merged[field] = [str(v) for v in value if str(v).strip()]

        return ExtractedTripData(**{k: v for k, v in merged.items() if v not in (None, [], "")})

    def _regex_extraction(self, text: str) -> Dict[str, Any]:
        """Pull what we can out of a free-form transcript without a model."""
        data: Dict[str, Any] = {}
        if not text:
            return data

        start = _titleise(_first_match(_START_HINTS, text))
        if start:
            data["startLocation"] = start

        dest = _titleise(_first_match(_DEST_HINTS, text))
        if dest:
            data["destination"] = dest

        budget = _first_match(_BUDGET_HINTS, text)
        if budget:
            data["budget"] = int(re.sub(r"[^\d]", "", budget))

        duration = _DURATION_HINT.search(text)
        if duration:
            data["duration"] = int(duration.group(1))

        if re.search(r"\b(inr|rs\.?|rupees?|₹)\b", text, re.I):
            data["currency"] = "INR"
        elif re.search(r"\b(usd|\$|dollars?)\b", text, re.I):
            data["currency"] = "USD"
        elif re.search(r"\b(eur|€)\b", text, re.I):
            data["currency"] = "EUR"
        elif re.search(r"\b(gbp|£)\b", text, re.I):
            data["currency"] = "GBP"

        mood = _MOOD_HINTS.search(text)
        if mood:
            data["preferences"] = [mood.group(1).lower()]

        return data
