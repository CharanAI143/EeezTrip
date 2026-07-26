from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.trip import TripRequest, TripResponse
from backend.app.services.trip_recommendation_service import TripRecommendationService

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

@router.post(
    "/generate",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate AI-powered trip recommendation",
    description="Thin controller delegating trip recommendation request to TripRecommendationService."
)
async def generate_recommendation(req: TripRequest):
    service = TripRecommendationService()
    try:
        recommendation, _ = await service.generate_recommendation(req)
        return recommendation
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to generate trip recommendation: {str(exc)}"
        )
