from typing import List, Dict, Any, Optional
from datetime import datetime
from bson import ObjectId
from backend.app.core.database import db_manager

class TripRepository:
    """MongoDB repository abstraction for trip documents."""

    def _get_collection(self):
        db = db_manager.get_database()
        if db is None:
            return None
        return db.trips

    async def create_trip(self, trip_data: Dict[str, Any]) -> str:
        """Insert a new trip document and return its string ID."""
        coll = self._get_collection()
        doc = {
            **trip_data,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z",
        }
        if coll is not None:
            result = await coll.insert_one(doc)
            return str(result.inserted_id)
        # In-memory fallback ID if DB connection unavailable
        return "mock_trip_id_" + datetime.utcnow().strftime("%Y%m%d%H%M%S")

    async def get_trip(self, trip_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a single trip document by string ObjectId."""
        coll = self._get_collection()
        if coll is None:
            return None
        try:
            oid = ObjectId(trip_id)
        except Exception:
            return None
        doc = await coll.find_one({"_id": oid})
        if doc and "_id" in doc:
            doc["id"] = str(doc.pop("_id"))
        return doc

    async def update_trip(self, trip_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing trip document."""
        coll = self._get_collection()
        if coll is None:
            return False
        try:
            oid = ObjectId(trip_id)
        except Exception:
            return False
        updates["updated_at"] = datetime.utcnow().isoformat() + "Z"
        result = await coll.update_one({"_id": oid}, {"$set": updates})
        return result.modified_count > 0

    async def list_recent(self, user_id: str = "anonymous", limit: int = 10) -> List[Dict[str, Any]]:
        """List recent trips for a given user."""
        coll = self._get_collection()
        if coll is None:
            return []
        query = {} if user_id == "all" else {"user_id": user_id}
        cursor = coll.find(query).sort("created_at", -1).limit(limit)
        trips = []
        async for doc in cursor:
            if "_id" in doc:
                doc["id"] = str(doc.pop("_id"))
            trips.append(doc)
        return trips
