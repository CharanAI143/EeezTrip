from typing import Dict, Any

class ImageModel:
    """Placeholder persistence model for ImageAsset entity."""
    def __init__(self, image_id: str, url: str, alt: str, author: str):
        self.image_id = image_id
        self.url = url
        self.alt = alt
        self.author = author

    def to_dict(self) -> Dict[str, Any]:
        return {
            "image_id": self.image_id,
            "url": self.url,
            "alt": self.alt,
            "author": self.author,
        }
