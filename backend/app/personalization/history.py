from typing import List
from backend.app.personalization.schemas import PreferenceHistoryEntry

class PreferenceHistoryTracker:
    """Tracks historical preference profile adjustments."""

    def __init__(self):
        self._history: List[PreferenceHistoryEntry] = []

    def record_entry(self, entry: PreferenceHistoryEntry) -> None:
        self._history.append(entry)

    def get_history(self) -> List[PreferenceHistoryEntry]:
        return list(self._history)
