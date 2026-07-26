from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional

from backend.app.schemas.daily_brief import (
    DailyBrief, OptimizeDayRequest, DeviceTokenRequest, NotificationPreferences
)
from backend.app.schemas.trip import PlanRevisionRequest, PlanRevisionResponse
from backend.app.services.daily_brief_service import DailyBriefService
from backend.app.services.trip_revision_service import TripRevisionService
from backend.app.services.notification_service import NotificationService

router = APIRouter(prefix="/daily-brief", tags=["Smart Daily Brief"])
notif_service = NotificationService()

@router.get(
    "/today",
    response_model=DailyBrief,
    status_code=status.HTTP_200_OK,
    summary="Fetch today's Smart Daily Brief & Trip Health Score"
)
async def get_today_brief(
    destination: str = Query("Goa", min_length=2),
    session_id: Optional[str] = Query(None)
):
    service = DailyBriefService()
    try:
        return await service.generate_daily_brief(destination, session_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to generate daily brief: {str(exc)}"
        )

@router.post(
    "/optimize-day",
    response_model=PlanRevisionResponse,
    status_code=status.HTTP_200_OK,
    summary="Trigger structured Optimize My Day revision flow"
)
async def optimize_day(req: OptimizeDayRequest, revision_req: PlanRevisionRequest):
    service = TripRevisionService()
    try:
        # Reason mapping for structured revision
        reason_map = {
            "WEATHER_OPTIMIZATION": "Swap outdoor activities with indoor venues due to rain forecast.",
            "TRAFFIC_OPTIMIZATION": "Adjust day schedule to avoid peak evening traffic.",
            "MULTI_FACTOR_OPTIMIZATION": "Optimize day schedule for weather, transit, and budget efficiency."
        }
        revision_req.instruction = reason_map.get(req.reason, revision_req.instruction)
        return await service.revise_trip(revision_req)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to optimize day: {str(exc)}"
        )

@router.post(
    "/notifications/register-device",
    status_code=status.HTTP_200_OK,
    summary="Register device token for push notifications"
)
async def register_device(req: DeviceTokenRequest):
    success = notif_service.register_device_token(req)
    return {"registered": success, "user_id": req.user_id}

@router.get(
    "/notifications/preferences",
    response_model=NotificationPreferences,
    status_code=status.HTTP_200_OK,
    summary="Fetch user notification preferences"
)
async def get_notification_preferences(user_id: str = Query("anonymous")):
    return notif_service.get_preferences(user_id)

@router.post(
    "/notifications/preferences",
    response_model=NotificationPreferences,
    status_code=status.HTTP_200_OK,
    summary="Update user notification preferences"
)
async def update_notification_preferences(prefs: NotificationPreferences, user_id: str = Query("anonymous")):
    return notif_service.update_preferences(user_id, prefs)
