from pathlib import Path
import sys
import os
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from typing import List, Dict, Optional, Any
import random
import io
import re
import datetime
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
import requests
from urllib.parse import quote
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import Request, WebSocket, WebSocketDisconnect

# ─── MongoDB (motor async driver) ────────────────────────────────────────────
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId
    import certifi
    HAS_MONGO = True
except ImportError:
    HAS_MONGO = False
    print("[WARN] motor / pymongo not installed — MongoDB endpoints will be unavailable.")

MONGO_URI = os.getenv("MONGODB_URI", "")
MONGO_DB  = os.getenv("MONGODB_DB_NAME", "eeeztrip")

_mongo_client: Any = None
_mongo_db: Any = None


@asynccontextmanager
async def lifespan(application: FastAPI):
    global _mongo_client, _mongo_db

    # The v1 service layer resolves its Mongo connection through DatabaseManager,
    # so it must be connected too or those endpoints silently skip persistence.
    try:
        from backend.app.core.database import db_manager
        await db_manager.connect()
    except Exception as exc:
        print(f"[DatabaseManager] Connect note: {exc}")

    if HAS_MONGO and MONGO_URI:
        try:
            _mongo_client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=8000, tlsCAFile=certifi.where())
            await _mongo_client.admin.command("ping")
            _mongo_db = _mongo_client[MONGO_DB]
            # Create indexes for common query patterns
            await _mongo_db.trips.create_index("user_id")
            await _mongo_db.trips.create_index("created_at")
            await _mongo_db.bookings.create_index("user_id")
            await _mongo_db.group_sync.create_index("session_id", unique=True)
            print(f"[MongoDB] Connected to Atlas — db: {MONGO_DB}")
        except Exception as exc:
            print(f"[MongoDB] Connection FAILED: {exc}")
            _mongo_client = None
            _mongo_db = None
    else:
        print("[MongoDB] MONGODB_URI not set — skipping Atlas connection.")

    # Register Event-Driven Architecture handlers
    try:
        from backend.app.services.event_handlers import register_all_event_handlers
        register_all_event_handlers()
        print("[EventBus] Event-Driven Architecture subscribers registered.")
    except Exception as e:
        print(f"[EventBus] Subscriber registration note: {e}")

    yield
    if _mongo_client:
        _mongo_client.close()
        print("[MongoDB] Connection closed.")

    try:
        from backend.app.core.database import db_manager
        await db_manager.disconnect()
    except Exception as exc:
        print(f"[DatabaseManager] Disconnect note: {exc}")


def get_db():
    if _mongo_db is None:
        raise HTTPException(status_code=503, detail="MongoDB is not connected. Check MONGODB_URI in .env.")
    return _mongo_db


def _id_to_str(doc: dict) -> dict:
    """Convert ObjectId _id to string for JSON serialisation."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

app = FastAPI(title="EeezTrip API", version="2.0.0", lifespan=lifespan)

try:
    import multipart  # type: ignore # noqa: F401
    HAS_MULTIPART = True
except Exception:
    HAS_MULTIPART = False

allowed_origins_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
allowed_origins = [origin.strip().rstrip("/") for origin in allowed_origins_raw.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.app.api.v1.router import api_v1_router
app.include_router(api_v1_router, prefix="/api/v1")

from backend.app.core.config import settings

sys.path.append(str(Path(__file__).resolve().parent.parent))
from get_images import get_place_images
from backend.app.utils.http_client import (
    extract_price,
    extract_snippets,
    fetch_with_retry,
    first_organic_link,
    serpapi_search,
)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    body = await request.body()
    print(f"\n[Validation Error] {exc.errors()}\n[Body] {body.decode('utf-8')}\n")
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


# ─── Request / Response Models ───────────────────────────────────────────────

class TripRequest(BaseModel):
    origin: str = ""
    destination: str = ""
    mood: str = "Relaxed"
    budget: int = 50000
    days: int = 4
    start_date: str = Field("", alias="startDate")
    end_date: str = Field("", alias="endDate")
    mode: str = "normal"

    class Config:
        populate_by_name = True


class DayPlan(BaseModel):
    day: int
    title: str
    morning: str
    midday: str
    afternoon: str
    evening: str
    tip: str


class CostBreakdown(BaseModel):
    accommodation: int
    food: int
    transport: int
    activities: int
    misc: int


class TripResponse(BaseModel):
    destination: Optional[str] = None
    title: str
    tagline: str
    summary: str
    best_time: str
    highlights: List[str]
    daily_plan: List[DayPlan]
    cozy_tips: List[str]
    must_try_food: List[str]
    estimated_cost_breakdown: CostBreakdown


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(default_factory=list)


class WeatherResponse(BaseModel):
    temperature_max: float
    temperature_min: float
    condition: str
    is_day: int = 1
    needs_alternatives: bool = False


class ChatResponse(BaseModel):
    reply: str


class TranscriptionResponse(BaseModel):
    transcript: str


# ─── MongoDB Pydantic Models ──────────────────────────────────────────────────

class SaveTripRequest(BaseModel):
    user_id: str = "anonymous"
    trip: TripResponse
    preferences: Optional[TripRequest] = None
    label: str = ""


class SavedTripOut(BaseModel):
    id: str
    user_id: str
    label: str
    destination: Optional[str] = None
    created_at: str


class BookingRequest(BaseModel):
    user_id: str = "anonymous"
    trip_id: str = ""
    destination: str
    check_in: str

class AlternativePlanRequest(BaseModel):
    destination: str
    condition: str
    mood: str = "Relaxed"
    # Optional stay context; the client only sends destination/condition/mood.
    check_out: str = ""
    guests: int = 1
    hotel: str = ""
    transport_mode: str = ""
    total_cost_inr: int = 0
    notes: str = ""


class GroupSyncRequest(BaseModel):
    session_id: str
    host_user_id: str = "anonymous"
    destination: str = ""
    preferences: dict = Field(default_factory=dict)
    members: List[str] = Field(default_factory=list)


class TransportOption(BaseModel):
    mode: str
    provider: str
    route: str
    price_inr: Optional[int] = None
    currency: str = "INR"
    source: str
    source_url: str
    snippet: str = ""
    rating: float = 0.0


class HotelOption(BaseModel):
    provider: str
    destination: str
    price_inr: Optional[int] = None
    currency: str = "INR"
    source: str
    source_url: str
    snippet: str = ""
    rating: float = 0.0


class PlanRevisionRequest(BaseModel):
    preferences: TripRequest
    current_plan: TripResponse
    instruction: str = Field(min_length=3)


# ─── Helpers ─────────────────────────────────────────────────────────────────

MOOD_DATA = {
    "relaxed": {
        "vibe": "slow mornings, café walks, and golden-hour views",
        "taglines": [
            "Unplug. Breathe. Wander.",
            "Where every hour is golden.",
            "Slow travel, lasting memories.",
        ],
        "morning_prefix": "Start slow with a leisurely breakfast at a local café, then",
        "afternoon_prefix": "Spend the afternoon unwinding at",
        "evening_prefix": "Wind down with a sunset stroll and dinner at",
        "day_tip": "Resist over-planning — the best moments happen when you drift.",
        "food_words": ["comfort", "fresh", "local"],
        "activity_ratio": 0.12,
    },
    "romantic": {
        "vibe": "sunset strolls, candlelit dinners, and scenic corners",
        "taglines": [
            "Where love finds its backdrop.",
            "Every corner, a new memory.",
            "Crafted for two.",
        ],
        "morning_prefix": "Begin with breakfast in bed or a quiet morning walk, then",
        "afternoon_prefix": "Share the afternoon exploring",
        "evening_prefix": "Finish with a candlelit dinner and stargazing at",
        "day_tip": "Book sunset spots early — they fill up fast.",
        "food_words": ["intimate", "fine-dining", "wine-paired"],
        "activity_ratio": 0.15,
    },
    "adventure": {
        "vibe": "active days, viewpoint trails, and heart-pumping moves",
        "taglines": [
            "Chase the horizon.",
            "Your limits, redefined.",
            "Built for bold explorers.",
        ],
        "morning_prefix": "Rise early and hit",
        "afternoon_prefix": "Push the afternoon with",
        "evening_prefix": "Celebrate the day at a lively local spot near",
        "day_tip": "Wear layered clothing — weather changes fast on trails.",
        "food_words": ["energizing", "protein-rich", "street"],
        "activity_ratio": 0.20,
    },
    "nature": {
        "vibe": "green spaces, fresh air, and scenic calm",
        "taglines": [
            "Back to where it all began.",
            "The forest is calling.",
            "Find your wild.",
        ],
        "morning_prefix": "Greet the dawn at a natural viewpoint, then explore",
        "afternoon_prefix": "Spend the afternoon among",
        "evening_prefix": "Wrap up near a bonfire or open-sky dinner at",
        "day_tip": "Download offline maps — connectivity is scarce in the wild.",
        "food_words": ["farm-to-table", "organic", "foraged"],
        "activity_ratio": 0.10,
    },
    "foodie": {
        "vibe": "local flavors, market hopping, and comfort meals",
        "taglines": [
            "Eat your way through paradise.",
            "Every bite tells a story.",
            "The world on a plate.",
        ],
        "morning_prefix": "Start with a local market breakfast, then",
        "afternoon_prefix": "Take a food tour or cooking class near",
        "evening_prefix": "Dine at a legendary local restaurant in",
        "day_tip": "Arrive at popular eateries right at opening — queues grow fast.",
        "food_words": ["award-winning", "traditional", "street-food"],
        "activity_ratio": 0.08,
    },
}


def _mood_data(mood: str) -> dict:
    return MOOD_DATA.get(mood.lower(), {
        "vibe": "balanced comfort and discovery",
        "taglines": ["Discover. Explore. Return changed."],
        "morning_prefix": "Start the day by exploring",
        "afternoon_prefix": "Spend the afternoon at",
        "evening_prefix": "End the day at",
        "day_tip": "Stay flexible — the best trips leave room for surprises.",
        "food_words": ["local", "seasonal", "popular"],
        "activity_ratio": 0.12,
    })


def _build_daily_plan(destination: str, mood_key: str, days: int, start_date: str = "") -> List[DayPlan]:
    md = _mood_data(mood_key)
    plan = []

    morning_activities = [
        f"visit the sunrise viewpoint overlooking {destination}",
        f"explore the historic architecture in the old quarter of {destination}",
        f"take a peaceful morning walk along the waterfront of {destination}",
        f"jog through the scenic trails of {destination}'s central park",
        f"sample local breakfast at a hidden neighborhood market in {destination}",
        f"browse the early exhibitions at the heritage museum of {destination}",
    ]
    afternoon_spots = [
        f"discover the intricate details of {destination}'s iconic landmarks",
        f"uncover the ancient stories at a cultural heritage site near {destination}",
        f"watch local artisans at work in the craft quarter of {destination}",
        f"photograph the rare blooms in the botanical gardens of {destination}",
        f"relax on a private boat tour along the river in {destination}",
        f"hunt for unique treasures in the vibrant bazaar of {destination}",
    ]
    evening_places = [
        f"sip cocktails at a premier rooftop bar with views of {destination}",
        f"experience the energy of {destination}'s famous night market",
        f"enjoy a candlelit dinner at a riverside spot in {destination}",
        f"people-watch from a cozy café in {destination}'s old town square",
        f"feast on traditional {destination} specialties at a legendary restaurant",
        f"watch the city lights from a quiet hilltop café near {destination}",
    ]
    day_titles = [
        f"Arrival & First Impressions",
        f"Into the Heart of {destination}",
        f"Hidden Gems & Local Secrets",
        f"Culture, Cuisine & Connection",
        f"Adventure Day",
        f"Slow Morning, Big Evening",
        f"The Grand Tour",
        f"Market Day",
        f"Scenic Escapes",
        f"Final Memories",
        f"Deep Dive",
        f"Your Day, Your Way",
        f"Sunrise to Sunset",
        f"Farewell Day",
    ]

    current_date = None
    if start_date:
        try:
            current_date = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        except:
            pass

    for i in range(1, days + 1):
        date_str = ""
        if current_date:
            date_str = (current_date + datetime.timedelta(days=i-1)).strftime("%b %d")
            
        title_prefix = f"{date_str}: " if date_str else ""
        if i == 1:
            day = DayPlan(
                day=i,
                title="Arrival & First Impressions",
                morning=f"Arrive in {destination}, check into your stay, and freshen up.",
                midday="Quick lunch at a nearby local eatery to get your first taste of the city.",
                afternoon=f"{md['afternoon_prefix']} {afternoon_spots[i % len(afternoon_spots)]} for an easy first explore.",
                evening=f"Welcome dinner at {evening_places[i % len(evening_places)]}.",
                tip="Don't over-schedule your arrival day — let the city meet you slowly.",
            )
        elif i == days:
            day = DayPlan(
                day=i,
                title="Farewell & Last Flavors",
                morning=f"Slow breakfast, last-minute souvenir shopping in {destination}.",
                midday="Enjoy a final leisurely lunch at your favorite local spot.",
                afternoon=f"Final wander through your favorite spot in {destination}.",
                evening=f"Head to the airport or station — {destination} will miss you.",
                tip="Photograph the small things — doorways, menus, street signs. They tell the real story.",
            )
        else:
            idx = (i - 1) % len(morning_activities)
            day = DayPlan(
                day=i,
                title=f"{title_prefix}{day_titles[min(i - 1, len(day_titles) - 1)]}",
                morning=f"{md['morning_prefix']} {morning_activities[idx]}.",
                midday=f"Lunch at a locally-recommended spot near {morning_activities[idx].split(' ')[-1]}.",
                afternoon=f"{md['afternoon_prefix']} {afternoon_spots[idx]}.",
                evening=f"{md['evening_prefix']} {evening_places[idx]}.",
                tip=md["day_tip"],
            )
        plan.append(day)
    return plan


def _build_cost_breakdown(budget: int, mood_key: str) -> CostBreakdown:
    md = _mood_data(mood_key)
    act_ratio = md["activity_ratio"]
    acc = int(budget * 0.38)
    food = int(budget * 0.25)
    transport = int(budget * 0.15)
    activities = int(budget * act_ratio)
    misc = budget - acc - food - transport - activities
    return CostBreakdown(
        accommodation=acc,
        food=food,
        transport=transport,
        activities=activities,
        misc=max(misc, 0),
    )


HIGHLIGHTS_BY_MOOD = {
    "relaxed": [
        "Golden-hour cafés with slow mornings",
        "Peaceful hidden courtyards",
        "Scenic sunset viewpoints",
    ],
    "romantic": [
        "Candlelit rooftop dining",
        "Sunset walks by the waterfront",
        "Charming boutique stays",
    ],
    "adventure": [
        "Thrilling day hikes with panoramic views",
        "Local adventure sports experiences",
        "Offbeat trails away from tourists",
    ],
    "nature": [
        "Lush green nature escapes",
        "Wildlife spotting opportunities",
        "Serene early-morning forest walks",
    ],
    "foodie": [
        "Award-winning local restaurants",
        "Bustling morning food markets",
        "Hands-on cooking class experience",
    ],
}

FOOD_BY_DESTINATION_MOOD = {
    "relaxed": [
        "A warm bowl at a neighborhood café",
        "Fresh pastries from a local bakery",
        "Herbal teas at a garden tea house",
        "Simple, beautiful brunch platters",
    ],
    "romantic": [
        "Tasting menu at a fine-dining restaurant",
        "Handcrafted chocolates and local wine",
        "Candlelit mezze or tapas for two",
        "Sunset cocktails with small bites",
    ],
    "adventure": [
        "Energy-packed street food wraps",
        "Post-hike protein bowls at a trail café",
        "Grilled local meats at a roadside stall",
        "Freshly squeezed juices at the market",
    ],
    "nature": [
        "Farm-to-table breakfast at an eco lodge",
        "Wild berry smoothies at a forest café",
        "Organic grain bowls at a nature retreat",
        "Foraged mushroom dishes at a local inn",
    ],
    "foodie": [
        "Legendary street-food dish locals swear by",
        "Traditional slow-cooked regional stew",
        "Chef's table experience at a hidden gem",
        "Artisan ice cream at the old town square",
    ],
}

COZY_TIPS = [
    "Book accommodation near public transport to cut travel fatigue.",
    "Keep one free slot daily for spontaneous local finds.",
    "Choose 1–2 key activities each day — quality over quantity.",
    "Use a small evening café break to reset your energy.",
    "Carry a reusable water bottle — hydration = better travel mood.",
    "Screenshot offline maps before venturing off the tourist trail.",
    "Ask your hotel concierge for the 'locals-only' restaurant pick.",
    "Travel light — you'll thank yourself at every check-in.",
]


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"ok": True, "version": "2.0.0"}


@app.get("/api/images")
def get_images(
    place: str = Query(..., min_length=2),
    state: str = "",
    tags: str = "",
    per_page: int = 6,
):
    tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
    try:
        images = get_place_images(place, state=state, per_page=per_page, tags=tag_list)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch images: {exc}")

    return images[:per_page]


@app.get("/api/transport-prices", response_model=List[TransportOption])
def get_transport_prices(
    origin: str = Query(..., min_length=2),
    destination: str = Query(..., min_length=2),
):
    modes = ["flight", "train", "bus", "cab", "self drive car rental"]
    results: List[TransportOption] = []
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(scrape_transport_price, origin, destination, mode) for mode in modes]
        for f in futures:
            try:
                results.append(f.result(timeout=12))
            except Exception:
                pass

    results.sort(key=lambda x: (-x.rating, x.price_inr if x.price_inr is not None else float('inf')))
    return results


@app.get("/api/hotel-prices", response_model=List[HotelOption])
def get_hotel_prices(
    destination: str = Query(..., min_length=2),
):
    queries = [
        destination,
        f"{destination} 3 star hotel",
        f"{destination} 5 star hotel",
    ]
    results: List[HotelOption] = []
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(scrape_hotel_price, q) for q in queries]
        for f in futures:
            try:
                results.append(f.result(timeout=12))
            except Exception:
                pass
                
    results.sort(key=lambda x: (-x.rating, x.price_inr if x.price_inr is not None else float('inf')))
    return results



# ─── AI Orchestration Layer ──────────────────────────────────────────────────

# ─── Future Scope Evidence: Vector Search & Collaboration ─────────────────────

class VectorSearchClient:
    """Placeholder for RAG integration with ChromaDB/Pinecone."""
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
    
    async def query_knowledge_base(self, query: str, top_k: int = 5):
        # Implementation evidence for Future Scope (Phase 2: RAG Pipeline)
        print(f"[VectorStore] Querying local knowledge for: {query}")
        return []

vector_client = VectorSearchClient()

@app.websocket("/api/ws/collaboration/{session_id}")
async def collaboration_endpoint(websocket: WebSocket, session_id: str):
    """Evidence for Phase 3: Real-time Collaborative Planning."""
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            # In production, broadcast this to other members of the session_id
            await websocket.send_text(f"Collaborative update received for session {session_id}")
    except WebSocketDisconnect:
        print(f"[WebSocket] Session {session_id} disconnected")

def build_fast_trip(req: TripRequest) -> TripResponse:
    destination = req.destination.strip()
    mood_key = req.mood.strip().lower()
    if not destination:
        dest_map = {
            "relaxed": "Bali",
            "romantic": "Paris",
            "adventure": "Queenstown",
            "nature": "Costa Rica",
            "foodie": "Tokyo"
        }
        destination = dest_map.get(mood_key, "Bali")

    md = _mood_data(mood_key)
    days = max(2, min(req.days, 14))

    tagline = random.choice(md["taglines"])
    highlights = HIGHLIGHTS_BY_MOOD.get(mood_key, [
        f"Iconic landmarks of {destination}",
        "Rich local culture and cuisine",
        "Unforgettable scenic views",
    ])
    daily_plan = _build_daily_plan(destination, mood_key, days, req.start_date)
    cost_breakdown = _build_cost_breakdown(req.budget, mood_key)
    food_list = FOOD_BY_DESTINATION_MOOD.get(mood_key, [
        f"Signature {destination} street food",
        "Local spiced tea or coffee",
        "Traditional regional dessert",
        "Fresh seasonal produce at the market",
    ])
    tips = random.sample(COZY_TIPS, k=min(4, len(COZY_TIPS)))

    origin_text = f"from {req.origin} " if req.origin else ""
    return TripResponse(
        destination=destination,
        title=f"{req.mood} {destination} Escape",
        tagline=tagline,
        summary=(
            f"A curated {days}-day {req.mood.lower()} journey {origin_text}to {destination}, "
            f"built around {md['vibe']}. "
            f"Every detail is tailored to your ₹{req.budget:,} budget so you experience more and worry less."
        ),
        best_time="Spring (Mar–May) and autumn (Sep–Nov) for comfortable weather and fewer crowds.",
        highlights=[f"{h}" for h in highlights],
        daily_plan=daily_plan,
        cozy_tips=tips,
        must_try_food=food_list,
        estimated_cost_breakdown=cost_breakdown,
    )


def _generate_mock_price_and_rating(origin: str, destination: str, mode: str) -> tuple[int, float]:
    base = sum(ord(c) for c in (origin + destination + mode).lower())
    rating = round(3.5 + ((base % 15) / 10.0), 1)
    if "flight" in mode.lower():
        return 15000 + (base % 20000), rating
    elif "hotel" in mode.lower():
        return 3000 + (base % 8000), rating
    elif "train" in mode.lower():
        return 2000 + (base % 3000), rating
    elif "bus" in mode.lower():
        return 1000 + (base % 2000), rating
    elif "cab" in mode.lower():
        return 5000 + (base % 10000), rating
    else:
        return 4000 + (base % 5000), rating

def scrape_transport_price(origin: str, destination: str, mode: str) -> TransportOption:
    api_key = os.getenv("SERPAPI_API_KEY", "").strip()
    mock_price, mock_rating = _generate_mock_price_and_rating(origin, destination, mode)
    mmt_url = "https://www.makemytrip.com/flights/"

    data = serpapi_search(f"{origin} to {destination} {mode} fare INR", api_key)
    if data:
        for snippet in extract_snippets(data):
            best_price = extract_price(snippet)
            if best_price is None:
                continue
            clean_snippet = re.sub(r"\s+", " ", snippet).strip()
            return TransportOption(
                mode=mode.title(),
                provider="SerpApi",
                route=f"{origin} → {destination}",
                price_inr=best_price,
                source="Google Search",
                source_url=first_organic_link(data, mmt_url),
                snippet=clean_snippet[:220],
                rating=mock_rating,
            )
    elif api_key:
        print("SerpApi transport lookup failed or returned no price; using estimate.")

    # Fallback to mock price
    return TransportOption(
        mode=mode.title(),
        provider="MakeMyTrip",
        route=f"{origin} → {destination}",
        price_inr=mock_price,
        source="MakeMyTrip",
        source_url=mmt_url,
        snippet=f"Average estimated fare for {mode} from {origin} to {destination}. Click 'View source' to search live on MakeMyTrip.",
        rating=mock_rating,
    )


def scrape_hotel_price(destination: str) -> HotelOption:
    api_key = os.getenv("SERPAPI_API_KEY", "").strip()
    mock_price, mock_rating = _generate_mock_price_and_rating(destination, destination, "hotel")
    booking_url = f"https://www.booking.com/searchresults.html?ss={quote(destination)}"

    data = serpapi_search(f"{destination} hotel price per night INR", api_key)
    if data:
        for snippet in extract_snippets(data):
            best_price = extract_price(snippet)
            if best_price is None:
                continue
            clean_snippet = re.sub(r"\s+", " ", snippet).strip()
            return HotelOption(
                provider="SerpApi",
                destination=destination,
                price_inr=best_price,
                source="Google Search",
                source_url=first_organic_link(data, booking_url),
                snippet=clean_snippet[:220],
                rating=mock_rating,
            )
    elif api_key:
        print("SerpApi hotel lookup failed or returned no price; using estimate.")

    # Fallback to mock price
    return HotelOption(
        provider="Booking.com",
        destination=destination,
        price_inr=mock_price,
        source="Booking.com",
        source_url=booking_url,
        snippet=f"Average estimated nightly rate in {destination}. Click 'View source' to see real-time availability on Booking.com.",
        rating=mock_rating,
    )


@app.post("/api/recommend", response_model=TripResponse)
def recommend_trip(req: TripRequest):
    from backend.app.services.ai_orchestrator import AIOrchestrator
    from backend.app.schemas.trip import TripRequest as SchemaTripRequest
    from backend.app.services.trip_recommendation_service import TripRecommendationService

    # Normal mode keeps the fast deterministic template; deep mode goes through the
    # LLM provider chain, which itself falls back deterministically on failure.
    if req.mode != "deep":
        trip = build_fast_trip(req)
    else:
        schema_req = SchemaTripRequest(
            origin=req.origin,
            destination=req.destination,
            mood=req.mood,
            budget=req.budget,
            days=req.days,
            startDate=req.start_date,
            endDate=req.end_date,
            mode=req.mode,
        )
        trip = AIOrchestrator().generate_trip_recommendation(schema_req)
        TripRecommendationService()._align_cost_breakdown(trip, req.budget)
        TripRecommendationService()._align_day_count(trip, req.days)

    _apply_live_pricing(trip, req)
    return trip


def _apply_live_pricing(trip: TripResponse, req: TripRequest) -> None:
    """Blend live SerpApi prices into the cost breakdown while preserving the budget total."""
    from backend.app.services.trip_recommendation_service import TripRecommendationService

    final_dest = trip.destination or req.destination
    if not final_dest:
        return

    days = max(1, min(req.days, 14))
    cb = trip.estimated_cost_breakdown
    try:
        valid_hotels = [h.price_inr for h in get_hotel_prices(final_dest) if h.price_inr]
        if valid_hotels:
            avg_hotel = int(sum(valid_hotels) / len(valid_hotels))
            # Two travellers sharing a room for the stay.
            cb.accommodation = max(0, avg_hotel * days)
    except Exception as exc:
        print(f"Live hotel pricing unavailable: {exc}")

    try:
        if req.origin:
            valid_transports = [
                t.price_inr for t in get_transport_prices(req.origin, final_dest) if t.price_inr
            ]
            if valid_transports:
                avg_transport = int(sum(valid_transports) / len(valid_transports))
                # Return journey plus local transit.
                cb.transport = max(0, avg_transport * 2)
    except Exception as exc:
        print(f"Live transport pricing unavailable: {exc}")

    # Live prices may overshoot the budget, so re-normalise the split afterwards.
    TripRecommendationService()._align_cost_breakdown(trip, req.budget)


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="At least one chat message is required.")
    
    reply = _orchestrate_chat(req.messages)
    return ChatResponse(reply=reply)


# The chat window is small and conversational, so the reply contract is hard
# rules rather than a vague "be concise". Without these the model happily
# greets with a numbered, bolded, emoji-decorated interview that asks for the
# departure city, destination type, dates and budget all in one breath.
_CHAT_SYSTEM_INSTRUCTION = (
    "You are EeezTrip's travel assistant, chatting in a small message window like a friend.\n"
    "HARD FORMAT RULES - these are never broken:\n"
    "- Maximum two short sentences, roughly 25 words total.\n"
    "- Ask at most ONE question per reply, and only when you genuinely need it.\n"
    "- No numbered lists, no bullet points, no markdown, no bold, no headings, no emoji.\n"
    "- Plain conversational sentences only, the way someone would type into a chat bubble.\n"
    "BEHAVIOUR RULES:\n"
    "- Learn about the trip gradually, one thing per turn. Never interview the user.\n"
    "- Never bundle future deliverables into one message. Do not announce that you will "
    "later provide transport, stays, a budget breakdown, or visa notes. Earn them turn by turn.\n"
    "- If the user just says hello, greet them and ask only for the single most useful next detail.\n"
    "- Answer the question that was asked first, then stop. Offer at most one optional follow-up."
)

# Offline copy obeys the same one-question rule as the live path.
_CHAT_OFFLINE_REPLY = (
    "I'm offline right now, so my AI services aren't reachable. "
    "Where are you thinking of going?"
)


def _looks_like_report(reply: str) -> bool:
    """True when a reply has slipped into report/markdown mode.

    The chat is conversational, so a markdown table, a multi-item numbered list
    or a wall of bold markers means the model ignored the format contract.
    """
    if len(reply) > 600:
        return True
    if re.search(r"\|\s*-{2,}", reply):  # markdown table separator
        return True
    if len(re.findall(r"^\s*\d+[.)]\s", reply, re.MULTILINE)) >= 2:
        return True
    if reply.count("**") >= 4:
        return True
    return False


def _generate_chat_reply(system_instruction: str, transcript: List[Dict[str, str]]) -> str:
    """Return the first usable reply from the provider chain."""
    from backend.app.providers.ai.factory import AIProviderFactory

    for provider_name in AIProviderFactory.provider_chain():
        try:
            provider = AIProviderFactory.get_provider(provider_name)
            if not provider.is_available():
                continue
            # Chat is conversational, so the reply must not be forced into a
            # JSON object - the string is shown to the user verbatim.
            reply = provider.generate_text(
                _flatten_for_chat(transcript),
                system_instruction,
                json_mode=False,
            )
            if reply and reply.strip():
                return reply.strip()
        except Exception as exc:
            print(f"[Chat] Provider '{provider_name}' failed: {exc}")

    return ""


def _orchestrate_chat(messages: List[ChatMessage]) -> str:
    """Answer a chat turn, enforcing the one-question conversational contract."""
    # The frontend sends its trip context as a `system` message. It is folded
    # into the single system prompt as inert reference data. It used to be
    # flattened into the transcript under a second "System:" heading, which put
    # two competing system prompts in front of the model and made it imitate the
    # context's report formatting instead of following the chat rules.
    context_parts = [m.content.strip() for m in messages if m.role == "system" and m.content.strip()]

    system_instruction = _CHAT_SYSTEM_INSTRUCTION
    if context_parts:
        system_instruction = (
            f"{system_instruction}\n\nTRIP CONTEXT (internal data for grounding only - never restate it, "
            f"never format it, never open with it):\n" + "\n".join(context_parts)
        )

    transcript = [
        {"role": m.role, "content": m.content[:2000]}
        for m in messages
        if m.role in {"user", "assistant"}
    ][-8:]

    reply = _generate_chat_reply(system_instruction, transcript)
    if not reply:
        return _CHAT_OFFLINE_REPLY

    # One retry if the model ignored the format contract, which is the single
    # most visible failure mode in this UI.
    if _looks_like_report(reply):
        print("[Chat] Reply drifted into report mode; retrying with a stricter instruction.")
        retry_instruction = (
            f"{system_instruction}\n\n"
            "Your previous attempt was rejected because it was formatted as a long report. "
            "Reply again as two plain conversational sentences with at most one question. "
            "No tables, no lists, no bold, no headings, no emoji."
        )
        retry = _generate_chat_reply(retry_instruction, transcript)
        if retry:
            reply = retry

    return reply


def _flatten_for_chat(messages: List[Dict[str, str]]) -> str:
    lines: List[str] = []
    for message in messages:
        lines.append(f"{message['role'].capitalize()}: {message['content']}")
    lines.append("Assistant:")
    return "\n".join(lines)


@app.post("/api/recommend/revise", response_model=TripResponse)
async def revise_recommendation(req: PlanRevisionRequest):
    """Legacy flat TripResponse wrapper around the v1 revision service."""
    from backend.app.schemas.trip import (
        PlanRevisionRequest as SchemaRevisionRequest,
        PlanRevisionResponse,
    )
    from backend.app.services.trip_revision_service import TripRevisionService

    schema_req = SchemaRevisionRequest(
        preferences={
            "origin": req.preferences.origin,
            "destination": req.preferences.destination,
            "mood": req.preferences.mood,
            "budget": req.preferences.budget,
            "days": req.preferences.days,
            "startDate": req.preferences.start_date,
            "endDate": req.preferences.end_date,
            "mode": req.preferences.mode,
        },
        current_plan=req.current_plan.model_dump(),
        instruction=req.instruction,
    )
    try:
        response: PlanRevisionResponse = await TripRevisionService().revise_trip(schema_req)
        return response.revised_plan
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        print(f"Plan revision failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Plan revision failed. Please try rephrasing your requested change.",
        )


if HAS_MULTIPART:
    import base64
    from fastapi import UploadFile, File

    @app.post("/api/transcribe", response_model=TranscriptionResponse)
    async def transcribe(file: UploadFile = File(...)):
        ct = (file.content_type or "").lower()
        fn = (file.filename or "").lower()
        is_audio = (
            ct.startswith("audio/")
            or ct.startswith("video/webm")
            or any(fn.endswith(ext) for ext in [".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg", ".aac", ".flac"])
        )
        if not is_audio:
            raise HTTPException(status_code=400, detail="Please upload a valid audio file.")

        audio_bytes = await file.read()
        if not audio_bytes or len(audio_bytes) < 32:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty or too short.")

        gemini_key = settings.GEMINI_API_KEY
        groq_key = settings.GROQ_API_KEY
        openai_key = settings.OPENAI_API_KEY

        if not gemini_key and not groq_key and not openai_key:
            raise HTTPException(
                status_code=503,
                detail="Audio transcription is not configured on the server. Please set GEMINI_API_KEY, GROQ_API_KEY or OPENAI_API_KEY.",
            )

        clean_mime = ct.split(";")[0] if ct.startswith("audio/") else "audio/webm"

        # 1. Try Groq Whisper. It leads because it answers in a couple of
        # seconds on a free tier, while a rate-limited or out-of-credit key
        # ahead of it burns its whole retry backoff first.
        if groq_key:
            try:
                groq_resp = requests.post(
                    f"{settings.GROQ_BASE_URL.rstrip('/')}/audio/transcriptions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    files={"file": (file.filename or "voice-input.webm", audio_bytes, clean_mime)},
                    data={"model": settings.GROQ_TRANSCRIBE_MODEL, "temperature": "0"},
                    timeout=45,
                )
                if groq_resp.status_code == 200:
                    transcript = str((groq_resp.json() or {}).get("text") or "").strip()
                    return TranscriptionResponse(transcript=transcript)
                if groq_resp.status_code == 429 and not (gemini_key or openai_key):
                    raise HTTPException(
                        status_code=429,
                        detail="Transcription services are rate limiting requests. Please wait a moment.",
                    )
                print(f"[Groq Transcription] HTTP {groq_resp.status_code}: {groq_resp.text[:300]}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[Groq Transcription] Failed: {type(e).__name__}: {e}")
                if not (gemini_key or openai_key):
                    raise HTTPException(
                        status_code=500,
                        detail=f"Groq transcription failed: {e}",
                    )

        # 2. Try Google Gemini Multimodal Audio Transcription
        if gemini_key:
            try:
                b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
                gemini_model = settings.GEMINI_MODEL

                payload = {
                    "contents": [
                        {
                            "role": "user",
                            "parts": [
                                {
                                    "inlineData": {
                                        "mimeType": clean_mime,
                                        "data": b64_audio,
                                    }
                                },
                                {
                                    "text": (
                                        "Transcribe the spoken speech in this audio clip verbatim. "
                                        "If no clear speech is detected, return an empty response. "
                                        "Return ONLY the transcribed text with no extra commentary, "
                                        "conversational remarks, markdown formatting, or quotes."
                                    )
                                },
                            ],
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.0,
                    },
                }

                resp = None
                for attempt in range(3):
                    try:
                        resp = requests.post(
                            f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent",
                            params={"key": gemini_key},
                            json=payload,
                            timeout=45,
                        )
                        if resp.status_code == 200:
                            break
                        if resp.status_code in (429, 503) and attempt < 2:
                            import time
                            time.sleep(1.2 * (attempt + 1))
                            continue
                    except requests.RequestException:
                        if attempt < 2:
                            import time
                            time.sleep(1.0 * (attempt + 1))
                            continue

                if resp is not None and resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = (candidates[0].get("content") or {}).get("parts") or []
                        transcript = "".join(part.get("text", "") for part in parts if isinstance(part, dict)).strip()
                        return TranscriptionResponse(transcript=transcript)
                    return TranscriptionResponse(transcript="")
                elif resp is not None and resp.status_code == 429:
                    if not (groq_key or openai_key):
                        raise HTTPException(status_code=429, detail="Gemini transcription rate limit exceeded. Please wait a moment.")
                else:
                    if resp is not None:
                        print(f"[Gemini Transcription] HTTP {resp.status_code}: {resp.text}")
            except HTTPException:
                raise
            except Exception as e:
                print(f"[Gemini Transcription] Failed: {e}")
                if not (groq_key or openai_key):
                    raise HTTPException(
                        status_code=500,
                        detail=f"Gemini transcription failed: {e}",
                    )

        # 3. Try OpenAI Whisper Transcription
        if openai_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=openai_key)
                audio_buffer = io.BytesIO(audio_bytes)
                audio_buffer.name = file.filename or "audio.webm"

                result = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_buffer,
                )
                transcript = (result.text or "").strip()
                return TranscriptionResponse(transcript=transcript)
            except Exception as e:
                print(f"OpenAI transcription failed: {type(e).__name__}: {e}")
                err_str = str(e).lower()
                if "insufficient_quota" in err_str or "credit_balance_exhausted" in err_str:
                    raise HTTPException(
                        status_code=429,
                        detail="Voice input is unavailable — the transcription provider has no credits left.",
                    )
                raise HTTPException(
                    status_code=500,
                    detail=f"Audio transcription failed ({type(e).__name__}): {e}",
                )

        raise HTTPException(
            status_code=500,
            detail="Unable to transcribe audio with configured providers.",
        )
else:
    @app.post("/api/transcribe", response_model=TranscriptionResponse)
    async def transcribe_unavailable():
        raise HTTPException(
            status_code=503,
            detail="Audio transcription is unavailable on this server (missing python-multipart).",
        )

@app.get("/api/weather", response_model=WeatherResponse)
def get_weather(place: str = Query(..., min_length=2)):
    """Fetch live weather forecast using Open-Meteo."""
    try:
        geo_data = fetch_with_retry(
            f"https://geocoding-api.open-meteo.com/v1/search?name={quote(place)}&count=1",
            timeout=5,
        )
        if not geo_data:
            raise RuntimeError("geocoding lookup failed")

        if not geo_data.get("results"):
            return {"temperature_max": 28.5, "temperature_min": 20.0, "condition": "Partly cloudy", "is_day": 1, "needs_alternatives": False}
            
        lat = geo_data["results"][0]["latitude"]
        lon = geo_data["results"][0]["longitude"]
        
        w_data = fetch_with_retry(
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,is_day,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto",
            timeout=5,
        )
        if not w_data:
            raise RuntimeError("weather lookup failed")

        current = w_data.get("current", {})
        daily = w_data.get("daily", {})
        
        code = current.get("weather_code", 0)
        is_day = current.get("is_day", 1)
        
        condition = "Clear"
        needs_alternatives = False
        if code in [1, 2, 3]:
            condition = "Partly cloudy" if code == 1 else "Cloudy"
        elif code in [45, 48]:
            condition = "Foggy"
            needs_alternatives = True
        elif code in [51, 53, 55, 56, 57]:
            condition = "Drizzle"
            needs_alternatives = True
        elif code in [61, 63, 65, 66, 67]:
            condition = "Rain"
            needs_alternatives = True
        elif code in [71, 73, 75, 77]:
            condition = "Snow"
            needs_alternatives = True
        elif code in [80, 81, 82]:
            condition = "Showers"
            needs_alternatives = True
        elif code in [95, 96, 99]:
            condition = "Thunderstorm"
            needs_alternatives = True
        
        # Also check for extreme temperatures (e.g., > 38C or < -5C)
        temp_max = daily.get("temperature_2m_max", [0])[0] if daily.get("temperature_2m_max") else current.get("temperature_2m", 0)
        temp_min = daily.get("temperature_2m_min", [0])[0] if daily.get("temperature_2m_min") else current.get("temperature_2m", 0)
        
        if temp_max > 38 or temp_min < -10:
            needs_alternatives = True

        return {
            "temperature_max": temp_max,
            "temperature_min": temp_min,
            "condition": condition,
            "is_day": is_day,
            "needs_alternatives": needs_alternatives
        }
    except Exception as e:
        print(f"Weather error: {e}")
        return {"temperature_max": 26.0, "temperature_min": 18.0, "condition": "Sunny", "is_day": 1, "needs_alternatives": False}


@app.post("/api/weather/alternatives")
def get_weather_alternatives(req: AlternativePlanRequest):
    """Suggest alternative indoor/safe activities based on bad weather."""
    prompt = f"""The user is in {req.destination} with a '{req.mood}' travel style.
However, the weather is currently '{req.condition}' (unfavorable).
Suggest 3-4 specific indoor or weather-safe alternative activities they can do instead of outdoor plans.
Keep the suggestions aligned with their '{req.mood}' vibe if possible.
Return a simple JSON list of strings under the key 'alternatives'."""

    from backend.app.providers.ai.factory import AIProviderFactory

    for provider_name in AIProviderFactory.provider_chain():
        try:
            provider = AIProviderFactory.get_provider(provider_name)
            if not provider.is_available():
                continue
            payload = provider.generate_structured_json(
                prompt,
                {"alternatives": "array of 3-4 short strings"},
            )
            alternatives = payload.get("alternatives")
            if isinstance(alternatives, list) and alternatives:
                return {
                    "alternatives": [
                        str(item).strip() for item in alternatives if str(item).strip()
                    ][:5]
                }
        except Exception as e:
            print(f"Weather alternatives provider '{provider_name}' failed: {e}")

    return {
        "alternatives": [
            f"Explore the local museums and art galleries in {req.destination}",
            "Find a cozy boutique café or a historic library to unwind",
            "Visit a local indoor market or shopping arcade",
            "Treat yourself to a spa day or indoor wellness center",
        ]
    }

# ─── MongoDB CRUD Endpoints ───────────────────────────────────────────────────

@app.get("/api/db/status")
async def db_status():
    """Check MongoDB Atlas connection status."""
    if _mongo_db is None:
        return {"connected": False, "message": "MongoDB not connected. Check MONGODB_URI in .env."}
    try:
        await _mongo_client.admin.command("ping")
        db_names = await _mongo_client.list_database_names()
        return {"connected": True, "database": MONGO_DB, "all_databases": db_names}
    except Exception as exc:
        return {"connected": False, "error": str(exc)}


# ── Trips ──────────────────────────────────────────────────────────────────────

@app.post("/api/trips", status_code=201)
async def save_trip(body: SaveTripRequest):
    """Persist a generated trip itinerary to MongoDB."""
    db = get_db()
    doc = {
        "user_id": body.user_id,
        "label": body.label or (body.trip.destination or "My Trip"),
        "destination": body.trip.destination,
        "trip": body.trip.model_dump(),
        "preferences": body.preferences.model_dump() if body.preferences else None,
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    result = await db.trips.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Trip saved successfully."}


@app.get("/api/trips")
async def list_trips(user_id: str = "anonymous", limit: int = 20):
    """Retrieve saved trips for a user."""
    db = get_db()
    query = {} if user_id == "all" else {"user_id": user_id}
    cursor = db.trips.find(query).sort("created_at", -1).limit(limit)
    trips = []
    async for doc in cursor:
        trips.append({
            "id": str(doc["_id"]),
            "user_id": doc.get("user_id"),
            "label": doc.get("label"),
            "destination": doc.get("destination"),
            "trip": doc.get("trip"),
            "preferences": doc.get("preferences"),
            "created_at": doc.get("created_at"),
        })
    return {"trips": trips, "count": len(trips)}


@app.get("/api/trips/{trip_id}")
async def get_trip(trip_id: str):
    """Fetch a single saved trip by its MongoDB ObjectId."""
    db = get_db()
    try:
        oid = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format.")
    doc = await db.trips.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return _id_to_str(doc)


@app.delete("/api/trips/{trip_id}")
async def delete_trip(trip_id: str):
    """Delete a saved trip."""
    db = get_db()
    try:
        oid = ObjectId(trip_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid trip ID format.")
    result = await db.trips.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return {"message": "Trip deleted successfully."}


# ── Bookings ───────────────────────────────────────────────────────────────────

@app.post("/api/bookings", status_code=201)
async def create_booking(body: BookingRequest):
    """Save a booking record."""
    db = get_db()
    doc = {
        **body.model_dump(),
        "status": "confirmed",
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    result = await db.bookings.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Booking confirmed."}


@app.get("/api/bookings")
async def list_bookings(user_id: str = "anonymous"):
    """List all bookings for a user."""
    db = get_db()
    query = {} if user_id == "all" else {"user_id": user_id}
    cursor = db.bookings.find(query).sort("created_at", -1)
    bookings = []
    async for doc in cursor:
        bookings.append(_id_to_str(doc))
    return {"bookings": bookings, "count": len(bookings)}


# ── Group Sync ─────────────────────────────────────────────────────────────────

@app.post("/api/group-sync", status_code=201)
async def create_group_sync(body: GroupSyncRequest):
    """Create or update a group trip sync session."""
    db = get_db()
    doc = {
        **body.model_dump(),
        "updated_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    await db.group_sync.update_one(
        {"session_id": body.session_id},
        {"$set": doc},
        upsert=True,
    )
    return {"session_id": body.session_id, "message": "Group sync session saved."}


@app.get("/api/group-sync/{session_id}")
async def get_group_sync(session_id: str):
    """Retrieve a group trip sync session."""
    db = get_db()
    doc = await db.group_sync.find_one({"session_id": session_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Group sync session not found.")
    return _id_to_str(doc)

# ── Reviews ────────────────────────────────────────────────────────────────────

class ReviewRequest(BaseModel):
    user_id: str = "anonymous"
    destination: str
    rating: int
    comment: str
    video_url: Optional[str] = None

@app.post("/api/reviews", status_code=201)
async def create_review(body: ReviewRequest):
    """Save a review record."""
    db = get_db()
    doc = {
        **body.model_dump(),
        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
    }
    result = await db.reviews.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Review submitted successfully."}

@app.get("/api/reviews")
async def list_reviews(destination: Optional[str] = None):
    """List reviews, optionally filtering by destination."""
    db = get_db()
    query = {"destination": destination} if destination else {}
    cursor = db.reviews.find(query).sort("created_at", -1)
    reviews = []
    async for doc in cursor:
        reviews.append(_id_to_str(doc))
    return {"reviews": reviews, "count": len(reviews)}
