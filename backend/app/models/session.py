from typing import Dict, Any, List, Optional
from datetime import datetime

class RevisionHistoryModel:
    """Model representing an immutable revision snapshot log."""
    def __init__(
        self,
        instruction: str,
        change_summary: str,
        itinerary_snapshot: Dict[str, Any],
        timestamp: Optional[str] = None
    ):
        self.instruction = instruction
        self.change_summary = change_summary
        self.itinerary_snapshot = itinerary_snapshot
        self.timestamp = timestamp or datetime.utcnow().isoformat() + "Z"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "instruction": self.instruction,
            "change_summary": self.change_summary,
            "itinerary_snapshot": self.itinerary_snapshot,
            "timestamp": self.timestamp,
        }

class TripSessionModel:
    """Model representing a Single Source of Truth Trip Session."""
    def __init__(
        self,
        session_id: str,
        user_id: str = "anonymous",
        preferences: Optional[Dict[str, Any]] = None,
        current_itinerary: Optional[Dict[str, Any]] = None,
        revision_history: Optional[List[Dict[str, Any]]] = None
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.preferences = preferences or {}
        self.current_itinerary = current_itinerary or {}
        self.revision_history = revision_history or []
        self.created_at = datetime.utcnow().isoformat() + "Z"
        self.updated_at = datetime.utcnow().isoformat() + "Z"

    def append_revision(self, instruction: str, change_summary: str, itinerary_snapshot: Dict[str, Any]) -> None:
        rev = RevisionHistoryModel(instruction, change_summary, itinerary_snapshot)
        self.revision_history.append(rev.to_dict())
        self.current_itinerary = itinerary_snapshot
        self.updated_at = datetime.utcnow().isoformat() + "Z"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "user_id": self.user_id,
            "preferences": self.preferences,
            "current_itinerary": self.current_itinerary,
            "revision_history": self.revision_history,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }
