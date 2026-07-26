from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.trip import PlanRevisionRequest, PlanRevisionResponse
from backend.app.services.trip_revision_service import TripRevisionService

router = APIRouter(prefix="/trips", tags=["Trip Revision"])

@router.post(
    "/revise",
    response_model=PlanRevisionResponse,
    status_code=status.HTTP_200_OK,
    summary="Revise trip itinerary based on natural language feedback",
    description="Thin controller delegating trip revision request to TripRevisionService."
)
async def revise_trip(req: PlanRevisionRequest):
    service = TripRevisionService()
    try:
        response = await service.revise_trip(req)
        return response
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to revise trip itinerary: {str(exc)}"
        )
