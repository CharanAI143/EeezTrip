from typing import Dict, Any, Optional
from datetime import datetime
import uuid
from backend.app.core.database import db_manager

class TripSessionRepository:
    """MongoDB repository for Trip Session persistence."""

    def _get_collection(self):
        db = db_manager.get_database()
        if db is None:
            return None
        return db.sessions

    async def create_session(
        self,
        user_id: str,
        preferences: Dict[str, Any],
        itinerary: Dict[str, Any]
    ) -> Dict[str, Any]:
        session_id = f"session_{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat() + "Z"

        doc = {
            "session_id": session_id,
            "user_id": user_id,
            "preferences": preferences,
            "current_itinerary": itinerary,
            "revision_history": [],
            "created_at": now,
            "updated_at": now,
        }

        coll = self._get_collection()
        if coll is not None:
            await coll.insert_one(doc)

        return doc

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        coll = self._get_collection()
        if coll is None:
            return None
        doc = await coll.find_one({"session_id": session_id})
        if doc and "_id" in doc:
            doc.pop("_id")
        return doc

    async def append_revision_to_session(
        self,
        session_id: str,
        instruction: str,
        change_summary: str,
        revised_itinerary: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        now = datetime.utcnow().isoformat() + "Z"
        revision_item = {
            "instruction": instruction,
            "change_summary": change_summary,
            "itinerary_snapshot": revised_itinerary,
            "timestamp": now,
        }

        coll = self._get_collection()
        if coll is not None:
            await coll.update_one(
                {"session_id": session_id},
                {
                    "$set": {
                        "current_itinerary": revised_itinerary,
                        "updated_at": now,
                    },
                    "$push": {
                        "revision_history": revision_item
                    }
                }
            )
            return await self.get_session(session_id)
        return None
