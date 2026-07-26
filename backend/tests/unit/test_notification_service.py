import pytest
from backend.app.services.notification_service import NotificationService
from backend.app.schemas.daily_brief import DeviceTokenRequest, NotificationPreferences

def test_notification_service_register_device_and_send():
    service = NotificationService()
    req = DeviceTokenRequest(user_id="user_123", device_token="token_abc_xyz", platform="web")
    assert service.register_device_token(req) is True

    # Send Morning Brief
    sent = service.send_morning_brief("user_123", "Goa", 92, "Optimal weather today.")
    assert sent is True

def test_notification_service_preferences_disabled():
    service = NotificationService()
    service.update_preferences("user_disabled", NotificationPreferences(morning_brief_enabled=False))

    sent = service.send_morning_brief("user_disabled", "Goa", 92, "Optimal weather today.")
    assert sent is False
