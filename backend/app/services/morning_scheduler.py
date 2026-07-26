from typing import Optional
from backend.app.services.daily_brief_service import DailyBriefService
from backend.app.services.notification_service import NotificationService

class MorningScheduler:
    """Morning Briefing Scheduler evaluating notification policies for active trips."""

    def __init__(
        self,
        brief_service: Optional[DailyBriefService] = None,
        notification_service: Optional[NotificationService] = None,
    ):
        self.brief_service = brief_service or DailyBriefService()
        self.notification_service = notification_service or NotificationService()

    async def execute_morning_run(self, user_id: str = "anonymous", destination: str = "Goa", session_id: Optional[str] = None) -> bool:
        """Load active trip session, generate daily brief, evaluate smart policy, and dispatch push notification."""
        brief = await self.brief_service.generate_daily_brief(destination, session_id)

        # Smart Notification Policy: Only notify if meaningful insights exist or score < 95
        if brief.can_optimize or brief.trip_health_score.score < 95 or len(brief.recommendations) > 0:
            return self.notification_service.send_morning_brief(
                user_id=user_id,
                destination=brief.destination,
                health_score=brief.trip_health_score.score,
                brief_summary=brief.summary
            )
        print("[MorningScheduler] Skipped morning push: No actionable advisories found today.")
        return False
