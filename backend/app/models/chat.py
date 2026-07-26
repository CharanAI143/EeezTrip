from typing import Dict, Any, List

class ChatSessionModel:
    """Placeholder persistence model for ChatSession entity."""
    def __init__(self, user_id: str, messages: List[Dict[str, str]]):
        self.user_id = user_id
        self.messages = messages

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "messages": self.messages,
        }
