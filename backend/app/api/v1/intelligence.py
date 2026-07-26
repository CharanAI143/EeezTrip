from fastapi import APIRouter, HTTPException, Query, status
from backend.app.schemas.intelligence import TravelIntelligenceResponse
from backend.app.services.travel_intelligence_service import TravelIntelligenceService

router = APIRouter(prefix="/intelligence", tags=["Travel Intelligence"])

@router.get(
    "/insights",
    response_model=TravelIntelligenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Fetch Travel Intelligence Insights for a destination"
)
async def get_travel_insights(destination: str = Query(..., min_length=2)):
    service = TravelIntelligenceService()
    try:
        return service.get_intelligence(destination)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to fetch travel intelligence insights: {str(exc)}"
        )
