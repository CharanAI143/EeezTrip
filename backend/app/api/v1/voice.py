from fastapi import APIRouter, HTTPException, status

from backend.app.schemas.discovery import ExtractedTripData, VoiceExtractRequest
from backend.app.services.discovery_service import DiscoveryService

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post(
    "/extract",
    response_model=ExtractedTripData,
    status_code=status.HTTP_200_OK,
    summary="Extract trip details from a spoken request",
    description="Parses a free-form transcript into destination, budget, duration and "
                "currency. Regex extraction fills any field the model does not return."
)
async def extract_voice_trip(req: VoiceExtractRequest):
    if not req.transcript.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="transcript must not be empty",
        )
    try:
        return DiscoveryService().voice_extract(req)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to extract trip details: {str(exc)}",
        )
