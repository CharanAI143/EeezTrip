from pathlib import Path
from typing import List, Dict, Optional
import sys
import random
import json
import io
import os
import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
import ollama
import requests

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi import Request

app = FastAPI(title="EeezTrip API", version="2.0.0")

LOCAL_OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:31b-cloud").strip() or "gemma4:31b-cloud"
DEEP_MODE_TIMEOUT_SEC = int(os.getenv("DEEP_MODE_TIMEOUT_SEC", "40"))

try:
    import multipart  # type: ignore # noqa: F401
    HAS_MULTIPART = True
except Exception:
    HAS_MULTIPART = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    mode: str = "normal"


class DayPlan(BaseModel):
    day: int
    title: str
    morning: str
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


class ChatResponse(BaseModel):
    reply: str


class TranscriptionResponse(BaseModel):
    transcript: str


class TransportOption(BaseModel):
    mode: str
    provider: str
    route: str
    price_inr: Optional[int] = None
    currency: str = "INR"
    source: str
    source_url: str
    snippet: str = ""


class HotelOption(BaseModel):
    provider: str
    destination: str
    price_inr: Optional[int] = None
    currency: str = "INR"
    source: str
    source_url: str
    snippet: str = ""


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


def _build_daily_plan(destination: str, mood_key: str, days: int) -> List[DayPlan]:
    md = _mood_data(mood_key)
    plan = []

    morning_activities = [
        f"a sunrise viewpoint overlooking {destination}",
        f"the historic old quarter of {destination}",
        f"a scenic waterfront walk in {destination}",
        f"the famous central park area of {destination}",
        f"a local neighborhood market in {destination}",
        f"the heritage museum district of {destination}",
    ]
    afternoon_spots = [
        f"the iconic landmarks of {destination}",
        f"a cultural heritage site near {destination}",
        f"the artisan craft quarter of {destination}",
        f"scenic gardens and botanical walks in {destination}",
        f"a lake or river promenade in {destination}",
        f"the vibrant bazaar streets of {destination}",
    ]
    evening_places = [
        f"a rooftop bar with city views of {destination}",
        f"the famous night market of {destination}",
        f"a riverside dining spot in {destination}",
        f"the old town square of {destination}",
        f"a locally-loved restaurant serving {destination} specialties",
        f"a hilltop café overlooking {destination}",
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

    for i in range(1, days + 1):
        if i == 1:
            day = DayPlan(
                day=i,
                title="Arrival & First Impressions",
                morning=f"Arrive in {destination}, check into your stay, and freshen up.",
                afternoon=f"{md['afternoon_prefix']} {afternoon_spots[i % len(afternoon_spots)]} for an easy first explore.",
                evening=f"Welcome dinner at {evening_places[i % len(evening_places)]}.",
                tip="Don't over-schedule your arrival day — let the city meet you slowly.",
            )
        elif i == days:
            day = DayPlan(
                day=i,
                title="Farewell & Last Flavors",
                morning=f"Slow breakfast, last-minute souvenir shopping in {destination}.",
                afternoon=f"Final wander through your favorite spot in {destination}.",
                evening=f"Head to the airport or station — {destination} will miss you.",
                tip="Photograph the small things — doorways, menus, street signs. They tell the real story.",
            )
        else:
            idx = (i - 1) % len(morning_activities)
            day = DayPlan(
                day=i,
                title=day_titles[min(i - 1, len(day_titles) - 1)],
                morning=f"{md['morning_prefix']} {morning_activities[idx]}.",
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
    return results


def ollama_generate_trip(req: TripRequest) -> TripResponse:
    prompt = f"""You are an expert luxury travel planner. The user wants a {req.days}-day trip from {req.origin or 'their location'}.
Their mood/style is {req.mood} and their total budget is ₹{req.budget:,} INR.

{f"The destination is {req.destination}." if req.destination else "Please choose the PERFECT destination for them based on their mood and budget!"}

Generate a detailed, highly curated itinerary. 
You MUST respond with a valid JSON object matching this schema perfectly:
{{
  "destination": "string (The chosen destination name, e.g. 'Bali')",
  "title": "string (Catchy title)",
  "tagline": "string (Short evocative tagline)",
  "summary": "string (A paragraph summarizing the trip, referencing origin, destination, mood, and budget)",
  "best_time": "string (Best time of year to visit)",
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

Important rules:
1. ONLY return the JSON object, absolutely no markdown formatting, no code blocks, no extra text.
2. The values in estimated_cost_breakdown MUST sum up to exactly {req.budget} and MUST be integers (Indian Rupees).
"""
    try:
        model = resolve_ollama_model(LOCAL_OLLAMA_MODEL)
        response = ollama.chat(
            model=model,
            messages=[{'role': 'user', 'content': prompt}],
            format='json',
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
    daily_plan = _build_daily_plan(destination, mood_key, days)
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


def scrape_transport_price(origin: str, destination: str, mode: str) -> TransportOption:
    query = f"{origin} to {destination} {mode} fare INR"
    search_url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
    }
    try:
        response = requests.get(search_url, headers=headers, timeout=8)
        response.raise_for_status()
        html = response.text

        title_match = re.search(r'class="result__a"[^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
        link_match = re.search(r'class="result__a" href="([^"]+)"', html, re.IGNORECASE)

        snippets = re.finditer(r'class="result__snippet"[^>]*>(.*?)</a?>', html, re.IGNORECASE | re.DOTALL)
        
        best_price = None
        best_snippet = ""
        first_snippet = ""
        
        for i, match in enumerate(snippets):
            raw_snippet = match.group(1)
            clean_snippet = re.sub(r"<[^>]+>", " ", raw_snippet)
            clean_snippet = re.sub(r"\s+", " ", clean_snippet).strip()
            
            if i == 0:
                first_snippet = clean_snippet
                
            price_match = re.search(r"(?:₹|INR|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{3,7})", clean_snippet, re.IGNORECASE)
            if price_match:
                best_price = int(price_match.group(1).replace(",", ""))
                best_snippet = clean_snippet
                break
                
        final_snippet = best_snippet if best_price else first_snippet
        title_text = title_match.group(1) if title_match else ""
        title_text = re.sub(r"<[^>]+>", " ", title_text).strip()
        full_text = f"{title_text} {final_snippet}".strip()

        return TransportOption(
            mode=mode.title(),
            provider="Web Search",
            route=f"{origin} → {destination}",
            price_inr=best_price,
            source="DuckDuckGo",
            source_url=link_match.group(1) if link_match else search_url,
            snippet=full_text[:220] if full_text else "Live price unavailable right now. Open source link to compare latest fares.",
        )
    except Exception:
        return TransportOption(
            mode=mode.title(),
            provider="Web Search",
            route=f"{origin} → {destination}",
            price_inr=None,
            source="DuckDuckGo",
            source_url=search_url,
            snippet="Live price unavailable right now. Open source link to compare latest fares.",
        )


def scrape_hotel_price(destination: str) -> HotelOption:
    query = f"{destination} hotel price per night INR"
    search_url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(query)}"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
        ),
    }
    try:
        response = requests.get(search_url, headers=headers, timeout=8)
        response.raise_for_status()
        html = response.text

        title_match = re.search(r'class="result__a"[^>]*>(.*?)</a>', html, re.IGNORECASE | re.DOTALL)
        link_match = re.search(r'class="result__a" href="([^"]+)"', html, re.IGNORECASE)

        snippets = re.finditer(r'class="result__snippet"[^>]*>(.*?)</a?>', html, re.IGNORECASE | re.DOTALL)
        
        best_price = None
        best_snippet = ""
        first_snippet = ""
        
        for i, match in enumerate(snippets):
            raw_snippet = match.group(1)
            clean_snippet = re.sub(r"<[^>]+>", " ", raw_snippet)
            clean_snippet = re.sub(r"\s+", " ", clean_snippet).strip()
            
            if i == 0:
                first_snippet = clean_snippet
                
            price_match = re.search(r"(?:₹|INR|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*|[0-9]{3,7})", clean_snippet, re.IGNORECASE)
            if price_match:
                best_price = int(price_match.group(1).replace(",", ""))
                best_snippet = clean_snippet
                break
                
        final_snippet = best_snippet if best_price else first_snippet
        title_text = title_match.group(1) if title_match else ""
        title_text = re.sub(r"<[^>]+>", " ", title_text).strip()
        full_text = f"{title_text} {final_snippet}".strip()

        return HotelOption(
            provider="Web Search",
            destination=destination,
            price_inr=best_price,
            source="DuckDuckGo",
            source_url=link_match.group(1) if link_match else search_url,
            snippet=full_text[:220] if full_text else "Live hotel price unavailable right now. Open source link to compare latest rates.",
        )
    except Exception:
        return HotelOption(
            provider="Web Search",
            destination=destination,
            price_inr=None,
            source="DuckDuckGo",
            source_url=search_url,
            snippet="Live hotel price unavailable right now. Open source link to compare latest rates.",
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
    if req.mode == "deep":
        with ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(ollama_generate_trip, req)
            try:
                return future.result(timeout=DEEP_MODE_TIMEOUT_SEC)
            except FuturesTimeoutError:
                return build_fast_trip(req)
            except Exception:
                return build_fast_trip(req)

    return build_fast_trip(req)


@app.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    if not req.messages:
        raise HTTPException(status_code=400, detail="At least one chat message is required.")
    reply = ollama_chat(req.messages)
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

