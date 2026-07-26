from pydantic import BaseModel, Field
from typing import Optional

class PlaceImageSchema(BaseModel):
    image_id: str
    url: str
    url_regular: Optional[str] = None
    url_small: Optional[str] = None
    alt: str
    author: str
    source: str
    source_link: Optional[str] = None
