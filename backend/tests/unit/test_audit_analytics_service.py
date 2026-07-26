import pytest
from backend.app.services.audit_service import AuditService
from backend.app.services.analytics_service import AnalyticsService
from backend.app.events.domain_events import TripCreated, ConciergeInteraction

def test_audit_service_records_event():
    audit_svc = AuditService()
    evt = TripCreated(user_id="user_audit", destination="Jaipur", trip_id="t_99")
    audit_svc.record_event(evt)

    trail = audit_svc.get_audit_trail()
    assert len(trail) >= 1
    assert trail[-1]["event_name"] == "TripCreated"

def test_analytics_service_tracks_event():
    analytics_svc = AnalyticsService()
    evt = ConciergeInteraction(user_id="u_ana", query="Is it rainy?", detected_intent="WEATHER_QUESTION")
    analytics_svc.track_event(evt)

    summary = analytics_svc.get_metrics_summary()
    assert summary.get("ConciergeInteraction", 0) >= 1
