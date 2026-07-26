from typing import Optional
from backend.app.schemas.concierge import ConciergeRequest, ConciergeResponse
from backend.app.services.intent_engine import IntentEngine
from backend.app.services.trip_session_service import TripSessionService

class ConciergeService:
    """Concierge orchestration service."""

    def __init__(
        self,
        intent_engine: Optional[IntentEngine] = None,
        session_service: Optional[TripSessionService] = None,
    ):
        self.intent_engine = intent_engine or IntentEngine()
        self.session_service = session_service or TripSessionService()

    async def handle_concierge_request(self, req: ConciergeRequest) -> ConciergeResponse:
        """Fetch session data if session_id is provided, and route query through Intent Engine."""
        session_data = None
        if req.session_id:
            session_data = await self.session_service.get_session(req.session_id)

        return await self.intent_engine.process_query(req, session_data)
