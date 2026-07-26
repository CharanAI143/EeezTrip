import json
from typing import Dict, Any, List, Optional

class TripContextBuilder:
    """Unified context builder compiling full Trip Session state for AI prompts."""

    @staticmethod
    def build_context_string(session_data: Dict[str, Any], intelligence_data: Optional[Dict[str, Any]] = None) -> str:
        """Compile preferences, current itinerary, revision history, and travel intelligence into a clean context prompt block."""
        pref = session_data.get("preferences", {})
        curr = session_data.get("current_itinerary", {})
        history: List[Dict[str, Any]] = session_data.get("revision_history", [])

        context_parts = [
            "=== SINGLE SOURCE OF TRUTH: TRIP SESSION CONTEXT ===",
            f"Destination: {pref.get('destination', curr.get('destination', 'Unknown'))}",
            f"Origin: {pref.get('origin', 'Flexible')}",
            f"Duration: {pref.get('days', 4)} Days",
            f"Travel Mood: {pref.get('mood', 'Relaxed')}",
            f"Total Budget: ₹{pref.get('budget', 50000):,} INR",
            "\nCURRENT ITINERARY SNAPSHOT:",
            json.dumps(curr, indent=2),
        ]

        if intelligence_data and intelligence_data.get("insights"):
            context_parts.append("\nREAL-TIME TRAVEL INTELLIGENCE INSIGHTS:")
            for insight in intelligence_data.get("insights", []):
                context_parts.append(f"- [{insight.get('badge', 'Alert')}] {insight.get('title')}: {insight.get('message')}")

        if history:
            context_parts.append("\nREVISION HISTORY LOG:")
            for idx, item in enumerate(history, 1):
                context_parts.append(
                    f"[{idx}] {item.get('timestamp')}: Request: '{item.get('instruction')}' -> Summary: {item.get('change_summary')}"
                )

        return "\n".join(context_parts)

    @staticmethod
    def build_summary_dict(session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Return structured dictionary view of session context."""
        return {
            "session_id": session_data.get("session_id"),
            "destination": session_data.get("preferences", {}).get("destination"),
            "budget": session_data.get("preferences", {}).get("budget"),
            "days": session_data.get("preferences", {}).get("days"),
            "revision_count": len(session_data.get("revision_history", [])),
        }
