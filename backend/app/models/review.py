from typing import Dict, Any, Optional

class ReviewModel:
    """Placeholder persistence model for Review entity."""
    def __init__(self, user_id: str, destination: str, rating: int, comment: str, video_url: Optional[str] = None):
        self.user_id = user_id
        self.destination = destination
        self.rating = rating
        self.comment = comment
        self.video_url = video_url

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "destination": self.destination,
            "rating": self.rating,
            "comment": self.comment,
            "video_url": self.video_url,
        }
