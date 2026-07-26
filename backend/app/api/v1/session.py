from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.session import CreateSessionRequest, TripSessionResponse
from backend.app.services.trip_session_service import TripSessionService

router = APIRouter(prefix="/sessions", tags=["Trip Sessions"])

@router.post(
    "/create",
    response_model=TripSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Trip Session Single Source of Truth",
    description="Thin controller delegating session creation to TripSessionService."
)
async def create_session(req: CreateSessionRequest):
    service = TripSessionService()
    try:
        session_data = await service.create_session(
            user_id=req.user_id,
            preferences=req.preferences,
            itinerary=req.itinerary
        )
        return session_data
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to create trip session: {str(exc)}"
        )

@router.get(
    "/{session_id}",
    response_model=TripSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch an existing Trip Session by session_id"
)
async def get_session(session_id: str):
    service = TripSessionService()
    session_data = await service.get_session(session_id)
    if not session_data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip session not found.")
    return session_data
