from fastapi import APIRouter
from backend.app.api.v1.recommendation import router as recommendation_router
from backend.app.api.v1.revision import router as revision_router
from backend.app.api.v1.session import router as session_router
from backend.app.api.v1.intelligence import router as intelligence_router
from backend.app.api.v1.concierge import router as concierge_router
from backend.app.api.v1.daily_brief import router as daily_brief_router
from backend.app.api.v1.booking import router as booking_router
from backend.app.api.v1.personalization import router as personalization_router

api_v1_router = APIRouter()
api_v1_router.include_router(recommendation_router)
api_v1_router.include_router(revision_router)
api_v1_router.include_router(session_router)
api_v1_router.include_router(intelligence_router)
api_v1_router.include_router(concierge_router)
api_v1_router.include_router(daily_brief_router)
api_v1_router.include_router(booking_router)
api_v1_router.include_router(personalization_router)
