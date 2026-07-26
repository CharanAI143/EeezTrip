from typing import Optional, Any
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
from backend.app.core.config import settings

class DatabaseManager:
    """Singleton MongoDB connection lifecycle manager."""
    _instance: Optional['DatabaseManager'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DatabaseManager, cls).__new__(cls)
            cls._instance.client = None
            cls._instance.db = None
        return cls._instance

    async def connect(self) -> None:
        """Establish non-blocking connection to MongoDB Atlas."""
        if settings.MONGODB_URI:
            try:
                self.client = AsyncIOMotorClient(
                    settings.MONGODB_URI,
                    serverSelectionTimeoutMS=8000,
                    tlsCAFile=certifi.where()
                )
                await self.client.admin.command("ping")
                self.db = self.client[settings.MONGODB_DB_NAME]
                print(f"[DatabaseManager] Connected to MongoDB database: {settings.MONGODB_DB_NAME}")
            except Exception as exc:
                print(f"[DatabaseManager] Connection error: {exc}")
                self.client = None
                self.db = None

    async def disconnect(self) -> None:
        """Close active MongoDB client connection."""
        if self.client:
            self.client.close()
            print("[DatabaseManager] Disconnected from MongoDB.")
            self.client = None
            self.db = None

    def get_database(self) -> Optional[Any]:
        """Return database instance reference."""
        return self.db

db_manager = DatabaseManager()
