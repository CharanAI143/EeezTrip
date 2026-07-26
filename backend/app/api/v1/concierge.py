from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.concierge import ConciergeRequest, ConciergeResponse
from backend.app.services.concierge_service import ConciergeService

router = APIRouter(prefix="/concierge", tags=["AI Travel Concierge"])

@router.post(
    "/chat",
    response_model=ConciergeResponse,
    status_code=status.HTTP_200_OK,
    summary="Process conversational query with session awareness & intent classification"
)
async def concierge_chat(req: ConciergeRequest):
    service = ConciergeService()
    try:
        return await service.handle_concierge_request(req)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Concierge unable to process query: {str(exc)}"
        )
