from fastapi import APIRouter, HTTPException, Query, status
from typing import List
from backend.app.schemas.booking import BookingRecommendation
from backend.app.booking.service import BookingIntelligenceService

router = APIRouter(prefix="/booking", tags=["Booking Intelligence"])

@router.get(
    "/opportunities",
    response_model=List[BookingRecommendation],
    status_code=status.HTTP_200_OK,
    summary="Fetch decision-support booking opportunities and savings recommendations"
)
async def get_booking_opportunities(destination: str = Query("Goa", min_length=2)):
    service = BookingIntelligenceService()
    try:
        return service.get_booking_intelligence(destination)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to fetch booking intelligence: {str(exc)}"
        )
