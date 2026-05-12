from pathlib import Path
from typing import List, Dict, Optional, Any
import sys
import random
import json
import io
import os
import re
import datetime
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
try:
    import ollama
    HAS_OLLAMA = True
except ImportError:
    HAS_OLLAMA = False
    print("[WARN] ollama package not installed — Ollama endpoints will be unavailable.")
import requests
from dotenv import load_dotenv
import google.generativeai as genai

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
    yield
    if _mongo_client:
        _mongo_client.close()
        print("[MongoDB] Connection closed.")


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

LOCAL_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:31b-cloud").strip() or "gemma4:31b-cloud"
DEEP_MODE_TIMEOUT_SEC = int(os.getenv("DEEP_MODE_TIMEOUT_SEC", "12"))

# Gemini Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

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

sys.path.append(str(Path(__file__).resolve().parent.parent))
from get_images import get_place_images

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
    mood: str
    check_out: str
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

def is_ollama_available() -> bool:
    """Check if local Ollama instance is responsive."""
    if not HAS_OLLAMA:
        return False
    try:
        # Pinging tags is a lightweight way to check health
        ollama.list()
        return True
    except Exception:
        return False

def gemini_generate_trip(req: TripRequest) -> TripResponse:
    """Fallback generator using Google Gemini."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not configured for fallback.")
    
    model = genai.GenerativeModel("gemini-1.5-flash")
    date_context = f"from {req.start_date} to {req.end_date}" if req.start_date and req.end_date else ""
    
    prompt = f"""You are an expert luxury travel planner. Create a {req.days}-day trip {date_context}.
Origin: {req.origin or 'Not set'}
Destination: {req.destination or 'Pick the best based on mood'}
Mood: {req.mood}
Budget: ₹{req.budget:,} INR

Return a valid JSON object matching this schema exactly:
{{
  "destination": "string",
  "title": "string",
  "tagline": "string",
  "summary": "string",
  "best_time": "string",
  "highlights": ["string", "string", "string"],
  "daily_plan": [
    {{
      "day": 1,
      "title": "string",
      "morning": "string",
      "midday": "string",
      "afternoon": "string",
      "evening": "string",
      "tip": "string"
    }}
  ],
  "cozy_tips": ["string", "string", "string"],
  "must_try_food": ["string", "string", "string"],
  "estimated_cost_breakdown": {{
    "accommodation": integer,
    "food": integer,
    "transport": integer,
    "activities": integer,
    "misc": integer
  }}
}}
Rules:
1. JSON ONLY, no markdown.
2. cost_breakdown must sum to {req.budget}.
"""
    response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
    data = json.loads(response.text)
    return TripResponse(**data)

def gemini_chat(messages: List[ChatMessage]) -> str:
    """Fallback chat using Google Gemini."""
    if not GEMINI_API_KEY:
        return "I'm sorry, I'm having trouble connecting to my AI services right now."
    
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Simple conversion of messages to Gemini format
    system_instruction = "You are EeezTrip's travel assistant. Keep answers concise, practical, and friendly."
    full_prompt = f"System Instruction: {system_instruction}\n\n"
    for m in messages[-5:]:
        full_prompt += f"{m.role}: {m.content}\n"
    
    response = model.generate_content(full_prompt)
    return response.text.strip()


def ollama_generate_trip(req: TripRequest) -> TripResponse:
    date_context = ""
    if req.start_date and req.end_date:
        date_context = f"The trip is from {req.start_date} to {req.end_date}. "
    elif req.start_date:
        date_context = f"The trip starts on {req.start_date}. "

    prompt = f"""You are an expert luxury travel planner. The user wants a {req.days}-day trip from {req.origin or 'their location'}.
{date_context}Their mood/style is {req.mood} and their total budget is ₹{req.budget:,} INR.

{f"The destination is {req.destination}." if req.destination else "Please choose the PERFECT destination for them based on their mood and budget!"}

Generate a detailed, authentic, and immersive itinerary. 
You MUST respond with a valid JSON object matching this schema perfectly:
{{
  "destination": "string (The chosen destination name, e.g. 'Bali')",
  "title": "string (Catchy, authentic title)",
  "tagline": "string (Short evocative tagline)",
  "summary": "string (A paragraph summarizing the trip, referencing origin, destination, mood, and budget)",
  "best_time": "string (Best time of year to visit, considering seasons and weather)",
  "highlights": ["string", "string", "string"],
  "daily_plan": [
    {{
      "day": 1,
      "title": "string (Descriptive title for the day's theme)",
      "morning": "string (6:00 AM - 11:30 AM: Specific place, activity, duration, and why it's worth it)",
      "midday": "string (11:30 AM - 2:30 PM: Lunch at a specific restaurant/area, activity, and travel time if any)",
      "afternoon": "string (2:30 PM - 6:00 PM: Specific place, activity, duration, and practical details like opening hours)",
      "evening": "string (6:00 PM - 10:00 PM: Dinner and leisure activity at a specific location, authentic local experience)",
      "tip": "string (Insider tip, reservation advice, or advance booking recommendation)"
    }}
  ],
  "cozy_tips": ["string (Practical travel details)", "string", "string"],
  "must_try_food": ["string (Local delicacies with brief description)", "string", "string"],
  "estimated_cost_breakdown": {{
    "accommodation": integer,
    "food": integer,
    "transport": integer,
    "activities": integer,
    "misc": integer
  }}
}}

Important Planning Rules:
1. SPECIFICITY: Use actual place names, landmarks, and restaurants. No generic descriptions.
2. TIMING: Include specific time ranges (e.g., 9:00 AM - 12:00 PM) for each block.
3. LOGIC: Minimize travel time between locations. Ensure a logical geographic flow to avoid backtracking.
4. VARIETY: Mix popular highlights with genuine local gems. Balance active exploration with rest.
5. PRACTICALITY: Mention estimated durations, travel times, and advance booking needs where relevant.
6. FORMAT: ONLY return the JSON object, no extra text or markdown code blocks.
7. BUDGET: Values in estimated_cost_breakdown MUST sum to exactly {req.budget} (integers).
"""
    try:
        model = resolve_ollama_model(LOCAL_OLLAMA_MODEL)
        response = ollama.chat(
            model=model,
            messages=[{'role': 'user', 'content': prompt}],
            format='json',
            options={
                "temperature": 0.5,
                "num_predict": 600,
            }
        )
        data = json.loads(response['message']['content'])
        return TripResponse(**data)
    except Exception as e:
        print(f"Ollama generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"AI generation failed. Please ensure Ollama is running and a local model is available.")


def ollama_chat(messages: List[ChatMessage]) -> str:
    system_prompt = (
        "You are EeezTrip's travel assistant. Keep answers concise, practical, and friendly. "
        "Focus on travel planning, destinations, budgets, transport, visas, and safety tips."
    )

    # Keep only the latest conversation turns to reduce latency.
    recent_messages = messages[-6:]
    formatted_messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    for message in recent_messages:
        role = message.role if message.role in {"user", "assistant", "system"} else "user"
        formatted_messages.append({"role": role, "content": message.content[:700]})

    chat_model = os.getenv("OLLAMA_CHAT_MODEL", LOCAL_OLLAMA_MODEL).strip() or LOCAL_OLLAMA_MODEL
    chat_model = resolve_ollama_model(chat_model)

    try:
        response = ollama.chat(
            model=chat_model,
            messages=formatted_messages,
            options={
                "temperature": 0.3,
                "top_p": 0.9,
            },
        )
        content = response.get("message", {}).get("content", "").strip()
        if not content:
            raise ValueError("Empty response from model")
        return content
    except Exception as e:
        print(f"Ollama chat failed: {e}")
        last_user_message = ""
        for message in reversed(messages):
            if message.role == "user":
                last_user_message = message.content.strip()
                break
        fallback = (
            "I could not reach the AI model right now. "
            "Please verify Ollama is running and the selected model is available. "
            "You can still continue by sharing destination, budget, and days, and I will help structure your plan."
        )
        if last_user_message:
            fallback = (
                f"I am having trouble connecting to the model right now, but I understood your request: "
                f"\"{last_user_message[:160]}\". "
                "Please try once more in a moment."
            )
        return fallback


def resolve_ollama_model(preferred_model: str) -> str:
    try:
        model_data = ollama.list()
        models = model_data.get("models", [])
        names = [m.get("name", "") for m in models if isinstance(m, dict)]
        if preferred_model in names:
            return preferred_model
        for name in names:
            if name:
                return name
    except Exception as e:
        print(f"Unable to resolve Ollama model list: {e}")
    return preferred_model


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
    mmt_url = f"https://www.makemytrip.com/flights/"
    
    if api_key:
        query = f"{origin} to {destination} {mode} fare INR"
        try:
            res = requests.get(
                "https://serpapi.com/search.json",
                params={"engine": "google", "q": query, "api_key": api_key},
                timeout=10
            )
            res.raise_for_status()
            data = res.json()
            
            snippets = []
            if "answer_box" in data and "snippet" in data["answer_box"]:
                snippets.append(data["answer_box"]["snippet"])
            for result in data.get("organic_results", [])[:3]:
                if "snippet" in result:
                    snippets.append(result["snippet"])
            
            for snippet in snippets:
                clean_snippet = re.sub(r"\s+", " ", snippet).strip()
                price_match = re.search(r"(?:₹|INR|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{3,7})", clean_snippet, re.IGNORECASE)
                if price_match:
                    best_price = int(price_match.group(1).replace(",", ""))
                    return TransportOption(
                        mode=mode.title(),
                        provider="SerpApi",
                        route=f"{origin} → {destination}",
                        price_inr=best_price,
                        source="Google Search",
                        source_url=data.get("organic_results", [{}])[0].get("link", mmt_url),
                        snippet=clean_snippet[:220],
                        rating=mock_rating,
                    )
        except Exception as e:
            if hasattr(e, 'response') and e.response is not None and e.response.status_code == 401:
                print("SerpApi key unauthorized for transport. Using mock data.")
            else:
                print(f"SerpApi transport error: {e}")
            
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
    booking_url = f"https://www.booking.com/searchresults.html?ss={requests.utils.quote(destination)}"
    
    if api_key:
        query = f"{destination} hotel price per night INR"
        try:
            res = requests.get(
                "https://serpapi.com/search.json",
                params={"engine": "google", "q": query, "api_key": api_key},
                timeout=10
            )
            res.raise_for_status()
            data = res.json()
            
            snippets = []
            if "answer_box" in data and "snippet" in data["answer_box"]:
                snippets.append(data["answer_box"]["snippet"])
            for result in data.get("organic_results", [])[:3]:
                if "snippet" in result:
                    snippets.append(result["snippet"])
            
            for snippet in snippets:
                clean_snippet = re.sub(r"\s+", " ", snippet).strip()
                price_match = re.search(r"(?:₹|INR|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{3,7})", clean_snippet, re.IGNORECASE)
                if price_match:
                    best_price = int(price_match.group(1).replace(",", ""))
                    return HotelOption(
                        provider="SerpApi",
                        destination=destination,
                        price_inr=best_price,
                        source="Google Search",
                        source_url=data.get("organic_results", [{}])[0].get("link", booking_url),
                        snippet=clean_snippet[:220],
                        rating=mock_rating,
                    )
        except Exception as e:
            if hasattr(e, 'response') and e.response is not None and e.response.status_code == 401:
                print("SerpApi key unauthorized for hotel. Using mock data.")
            else:
                print(f"SerpApi hotel error: {e}")

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


def ollama_revise_trip(req: PlanRevisionRequest) -> TripResponse:
    current_plan_json = json.dumps(req.current_plan.model_dump(), ensure_ascii=False)
    prompt = f"""You are an expert travel planner editing an existing itinerary.
User preferences:
- Origin: {req.preferences.origin or 'Not set'}
- Destination: {req.preferences.destination}
- Mood: {req.preferences.mood}
- Budget: INR {req.preferences.budget}
- Days: {req.preferences.days}

Current itinerary JSON:
{current_plan_json}

User change request:
{req.instruction}

Return ONLY a valid JSON object matching this schema:
{{
  "title": "string",
  "tagline": "string",
  "summary": "string",
  "best_time": "string",
  "highlights": ["string", "string", "string"],
  "daily_plan": [
    {{
      "day": 1,
      "title": "string",
      "morning": "string",
      "afternoon": "string",
      "evening": "string",
      "tip": "string"
    }}
  ],
  "cozy_tips": ["string", "string", "string"],
  "must_try_food": ["string", "string", "string"],
  "estimated_cost_breakdown": {{
    "accommodation": integer,
    "food": integer,
    "transport": integer,
    "activities": integer,
    "misc": integer
  }}
}}

Rules:
1. Keep the same number of days ({req.preferences.days}).
2. Respect the user's latest change request.
3. Cost breakdown must sum exactly to {req.preferences.budget}.
4. Return only raw JSON, no markdown.
"""
    model = resolve_ollama_model(LOCAL_OLLAMA_MODEL)
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        format="json",
        options={"temperature": 0.35, "num_predict": 2500},
    )
    data = json.loads(response["message"]["content"])
    return TripResponse(**data)


@app.post("/api/recommend", response_model=TripResponse)
def recommend_trip(req: TripRequest):
    trip = None
    if req.mode == "deep":
        # Orchestration logic: Try Ollama first, fallback to Gemini
        if is_ollama_available():
            try:
                with ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(ollama_generate_trip, req)
                    trip = future.result(timeout=DEEP_MODE_TIMEOUT_SEC)
            except Exception as e:
                print(f"Ollama deep generation failed, falling back to Gemini: {e}")
                if GEMINI_API_KEY:
                    try:
                        trip = gemini_generate_trip(req)
                    except Exception as ge:
                        print(f"Gemini fallback failed: {ge}")
                        trip = build_fast_trip(req)
                else:
                    trip = build_fast_trip(req)
        elif GEMINI_API_KEY:
            print("Ollama unavailable, using Gemini for deep mode.")
            try:
                trip = gemini_generate_trip(req)
            except Exception as e:
                print(f"Gemini generation failed: {e}")
                trip = build_fast_trip(req)
        else:
            print("No AI services available, using template generator.")
            trip = build_fast_trip(req)
    else:
        trip = build_fast_trip(req)

    # Sync the final estimated cost breakdown with real live pricing from SerpApi
    try:
        final_dest = trip.destination or req.destination
        if final_dest:
            hotel_opts = get_hotel_prices(final_dest)
            valid_hotels = [h.price_inr for h in hotel_opts if h.price_inr]
            if valid_hotels:
                avg_hotel = sum(valid_hotels) / len(valid_hotels)
                trip.estimated_cost_breakdown.accommodation = int(avg_hotel * req.days)
                
        if req.origin and final_dest:
            transport_opts = get_transport_prices(req.origin, final_dest)
            valid_transports = [t.price_inr for t in transport_opts if t.price_inr]
            if valid_transports:
                avg_transport = sum(valid_transports) / len(valid_transports)
                trip.estimated_cost_breakdown.transport = int(avg_transport * 2)
    except Exception as e:
        print(f"Failed to sync live prices to budget: {e}")

    return trip


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="At least one chat message is required.")
    
    # Orchestration logic for Chat
    if is_ollama_available():
        reply = ollama_chat(req.messages)
        # If ollama returned a fallback message, we might want to try Gemini instead
        if "I could not reach the AI model" in reply and GEMINI_API_KEY:
             reply = gemini_chat(req.messages)
    elif GEMINI_API_KEY:
        reply = gemini_chat(req.messages)
    else:
        reply = "I'm currently in offline mode. I can help with basic navigation, but full AI chat is unavailable."
        
    return ChatResponse(reply=reply)


@app.post("/api/recommend/revise", response_model=TripResponse)
def revise_recommendation(req: PlanRevisionRequest):
    try:
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(ollama_revise_trip, req)
            return future.result(timeout=max(150, DEEP_MODE_TIMEOUT_SEC))
    except Exception as e:
        print(f"Plan revision failed: {e}")
        raise HTTPException(status_code=500, detail="Plan revision failed. Please try rephrasing your requested change.")


if HAS_MULTIPART:
    from fastapi import UploadFile, File

    @app.post("/api/transcribe", response_model=TranscriptionResponse)
    async def transcribe(file: UploadFile = File(...)):
        if not file.content_type or not file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="Please upload a valid audio file.")

        audio_bytes = await file.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured for audio transcription.")

        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            audio_buffer = io.BytesIO(audio_bytes)
            audio_buffer.name = file.filename or "audio.webm"

            result = client.audio.transcriptions.create(
                model="gpt-4o-mini-transcribe",
                file=audio_buffer,
            )
            transcript = (result.text or "").strip()
            if not transcript:
                raise ValueError("Empty transcription")
            return TranscriptionResponse(transcript=transcript)
        except Exception as e:
            print(f"Audio transcription failed: {e}")
            raise HTTPException(status_code=500, detail="Audio transcription failed. Please try again.")
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
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={place}&count=1"
        geo_resp = requests.get(geo_url, timeout=5)
        geo_data = geo_resp.json()
        
        if not geo_data.get("results"):
            return {"temperature_max": 28.5, "temperature_min": 20.0, "condition": "Partly cloudy", "is_day": 1}
            
        lat = geo_data["results"][0]["latitude"]
        lon = geo_data["results"][0]["longitude"]
        
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,is_day,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto"
        w_resp = requests.get(weather_url, timeout=5)
        w_data = w_resp.json()
        
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
        return {"temperature_max": 26.0, "temperature_min": 18.0, "condition": "Sunny", "is_day": 1}


@app.post("/api/weather/alternatives")
def get_weather_alternatives(req: AlternativePlanRequest):
    """Suggest alternative indoor/safe activities based on bad weather."""
    prompt = f"""The user is in {req.destination} with a '{req.mood}' travel style.
However, the weather is currently '{req.condition}' (unfavorable).
Suggest 3-4 specific indoor or weather-safe alternative activities they can do instead of outdoor plans.
Keep the suggestions aligned with their '{req.mood}' vibe if possible.
Return a simple JSON list of strings under the key 'alternatives'."""

    try:
        # Use Ollama for the suggestion
        response = ollama.chat(
            model="llama3",
            messages=[{"role": "user", "content": prompt}],
            format="json"
        )
        content = response["message"]["content"]
        # Basic cleanup in case of markdown blocks
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
            
        return json.loads(content)
    except Exception as e:
        print(f"Alternatives error: {e}")
        # Generic fallbacks
        return {
            "alternatives": [
                f"Explore the local museums and art galleries in {req.destination}",
                "Find a cozy boutique café or a historic library to unwind",
                "Visit a local indoor market or shopping arcade",
                "Treat yourself to a spa day or indoor wellness center"
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
