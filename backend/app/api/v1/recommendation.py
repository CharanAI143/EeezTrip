from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.trip import TripRequest, TripResponse
from backend.app.schemas.discovery import (
    MoodChoice,
    MoodRequest,
    SeasonalData,
    SeasonalRequest,
)
from backend.app.services.trip_recommendation_service import TripRecommendationService
from backend.app.services.discovery_service import DiscoveryService

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


@router.post(
    "/mood",
    response_model=list[MoodChoice],
    status_code=status.HTTP_200_OK,
    summary="Suggest destinations that match a mood",
    description="Returns destination suggestions for a mood, budget and currency. "
                "Falls back to a curated catalogue when no AI provider is configured."
)
async def mood_recommendations(req: MoodRequest):
    return DiscoveryService().mood_recommendations(req)


@router.post(
    "/seasonal",
    response_model=SeasonalData,
    status_code=status.HTTP_200_OK,
    summary="Suggest seasonal destinations by distance",
    description="Returns nearby, national and global seasonal destination picks. "
                "Falls back to a curated catalogue when no AI provider is configured."
)
async def seasonal_recommendations(req: SeasonalRequest):
    return DiscoveryService().seasonal_recommendations(req)
