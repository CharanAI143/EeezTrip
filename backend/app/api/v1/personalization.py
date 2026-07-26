from fastapi import APIRouter, HTTPException, Query, status
from typing import Dict, Any
from backend.app.personalization.service import PersonalizationEngine
from backend.app.personalization.schemas import UserPreferenceProfile

router = APIRouter(prefix="/personalization", tags=["Personalization Engine"])
engine = PersonalizationEngine()

@router.get(
    "/profile",
    response_model=UserPreferenceProfile,
    status_code=status.HTTP_200_OK,
    summary="Fetch current transparent user preference profile"
)
async def get_user_profile():
    return engine.get_profile()

@router.post(
    "/preferences",
    response_model=UserPreferenceProfile,
    status_code=status.HTTP_200_OK,
    summary="Update explicit user preference"
)
async def update_preference(key: str = Query(...), value: Any = Query(...)):
    try:
        return engine.update_explicit_preference(key, value)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to update preference: {str(exc)}"
        )

@router.delete(
    "/profile",
    response_model=UserPreferenceProfile,
    status_code=status.HTTP_200_OK,
    summary="Reset preference profile to clean baseline"
)
async def reset_profile():
    return engine.reset_profile()

@router.post(
    "/learning/trigger",
    response_model=UserPreferenceProfile,
    status_code=status.HTTP_200_OK,
    summary="Trigger deterministic learning evaluation cycle"
)
async def trigger_learning():
    return engine.trigger_learning_cycle()
