from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from backend.app.schemas.daily_brief import NotificationPreferences, DeviceTokenRequest

class BaseNotificationProvider(ABC):
    """Abstract Base Interface for Push Notification Adapters."""

    @abstractmethod
    def send_push_notification(self, device_token: str, title: str, body: str, data: Optional[Dict[str, Any]] = None) -> bool:
        pass

class FCMNotificationAdapter(BaseNotificationProvider):
    """Firebase Cloud Messaging (FCM) Push Notification Provider implementation."""

    def send_push_notification(self, device_token: str, title: str, body: str, data: Optional[Dict[str, Any]] = None) -> bool:
        # Mockable FCM dispatch logic
        print(f"[FCMNotificationAdapter] Dispatched push to token '{device_token[:10]}...': {title} - {body}")
        return True

class NotificationService:
    """Service governing push notification dispatch, device tokens, and user preferences."""

    def __init__(self, provider: Optional[BaseNotificationProvider] = None):
        self.provider = provider or FCMNotificationAdapter()
        self._device_tokens: Dict[str, List[str]] = {}
        self._preferences: Dict[str, NotificationPreferences] = {}

    def register_device_token(self, req: DeviceTokenRequest) -> bool:
        if req.user_id not in self._device_tokens:
            self._device_tokens[req.user_id] = []
        if req.device_token not in self._device_tokens[req.user_id]:
            self._device_tokens[req.user_id].append(req.device_token)
        return True

    def get_preferences(self, user_id: str = "anonymous") -> NotificationPreferences:
        return self._preferences.get(user_id, NotificationPreferences())

    def update_preferences(self, user_id: str, prefs: NotificationPreferences) -> NotificationPreferences:
        self._preferences[user_id] = prefs
        return prefs

    def send_morning_brief(self, user_id: str, destination: str, health_score: int, brief_summary: str) -> bool:
        prefs = self.get_preferences(user_id)
        if not prefs.morning_brief_enabled:
            return False

        tokens = self._device_tokens.get(user_id, ["mock_device_token_123"])
        title = f"🌤 Your {destination} travel briefing is ready"
        body = f"Trip Health Score: {health_score}/100 — {brief_summary}"

        success = True
        for token in tokens:
            sent = self.provider.send_push_notification(token, title, body, {"destination": destination})
            success = success and sent
        return success

    def send_critical_alert(self, user_id: str, title: str, alert_details: str) -> bool:
        prefs = self.get_preferences(user_id)
        if not prefs.critical_alerts_enabled:
            return False

        tokens = self._device_tokens.get(user_id, ["mock_device_token_123"])
        success = True
        for token in tokens:
            sent = self.provider.send_push_notification(token, f"🚨 {title}", alert_details, {"priority": "high"})
            success = success and sent
        return success
