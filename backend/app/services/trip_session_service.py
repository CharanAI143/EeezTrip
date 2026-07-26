from typing import Dict, Any, Optional
from backend.app.repositories.trip_session_repository import TripSessionRepository
from backend.app.services.trip_context_builder import TripContextBuilder
from backend.app.schemas.trip import TripRequest, TripResponse

class TripSessionService:
    """Business service governing Trip Session lifecycle and context resolution."""

    def __init__(self, repository: TripSessionRepository = None):
        self.repository = repository or TripSessionRepository()

    async def create_session(
        self,
        user_id: str,
        preferences: TripRequest,
        itinerary: TripResponse
    ) -> Dict[str, Any]:
        """Create and persist a new Single Source of Truth Trip Session."""
        return await self.repository.create_session(
            user_id=user_id,
            preferences=preferences.model_dump(),
            itinerary=itinerary.model_dump()
        )

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve existing Trip Session by session_id."""
        return await self.repository.get_session(session_id)

    async def record_revision(
        self,
        session_id: str,
        instruction: str,
        change_summary: str,
        revised_itinerary: TripResponse
    ) -> Optional[Dict[str, Any]]:
        """Record revision snapshot in session history log."""
        return await self.repository.append_revision_to_session(
            session_id=session_id,
            instruction=instruction,
            change_summary=change_summary,
            revised_itinerary=revised_itinerary.model_dump()
        )

    def get_context(self, session_data: Dict[str, Any]) -> str:
        """Compile session context for AI completion prompts."""
        return TripContextBuilder.build_context_string(session_data)
