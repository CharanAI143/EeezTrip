from pydantic import BaseModel, Field
from typing import Dict, Any
from datetime import datetime
import uuid

class DomainEvent(BaseModel):
    """Base class for all in-process domain events in EeezTrip v3."""
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_name: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    aggregate_id: str = "global"
    metadata: Dict[str, Any] = Field(default_factory=dict)
