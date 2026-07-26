from typing import Optional, Dict, Any

class UserModel:
    """Placeholder persistence model for User entity."""
    def __init__(self, uid: str, email: Optional[str] = None, display_name: Optional[str] = None):
        self.uid = uid
        self.email = email
        self.display_name = display_name

    def to_dict(self) -> Dict[str, Any]:
        return {
            "uid": self.uid,
            "email": self.email,
            "display_name": self.display_name,
        }
