from pathlib import Path
from typing import List, Dict
import sys
import random

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="EeezTrip API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sys.path.append(Path(__file__).resolve().parent.parent)
from get_images import get_place_images


# ─── Request / Response Models ───────────────────────────────────────────────

class TripRequest(BaseModel):
    destination: str = Field(min_length=2)
    mood: str = "Relaxed"
    budget: int = 1200
    days: int = 4


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
    title: str
    tagline: str
    summary: str
    best_time: str
    highlights: List[str]
    daily_plan: List[DayPlan]
    cozy_tips: List[str]
    must_try_food: List[str]
    estimated_cost_breakdown: CostBreakdown


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


@app.post("/api/recommend", response_model=TripResponse)
def recommend_trip(req: TripRequest):
    destination = req.destination.strip()
    mood_key = req.mood.strip().lower()
    md = _mood_data(mood_key)
    days = max(2, min(req.days, 14))

    tagline = random.choice(md["taglines"])

    highlights = HIGHLIGHTS_BY_MOOD.get(mood_key, [
        f"Iconic landmarks of {destination}",
        "Rich local culture and cuisine",
        "Unforgettable scenic views",
    ])
    highlights = [f"{h}" for h in highlights]

    daily_plan = _build_daily_plan(destination, mood_key, days)
    cost_breakdown = _build_cost_breakdown(req.budget, mood_key)

    food_list = FOOD_BY_DESTINATION_MOOD.get(mood_key, [
        f"Signature {destination} street food",
        "Local spiced tea or coffee",
        "Traditional regional dessert",
        "Fresh seasonal produce at the market",
    ])

    tips = random.sample(COZY_TIPS, k=min(4, len(COZY_TIPS)))

    return TripResponse(
        title=f"{req.mood} {destination} Escape",
        tagline=tagline,
        summary=(
            f"A curated {days}-day {req.mood.lower()} journey through {destination}, "
            f"built around {md['vibe']}. "
            f"Every detail is tailored to your ${req.budget:,} budget — "
            f"so you experience more and worry less."
        ),
        best_time="Spring (Mar–May) and autumn (Sep–Nov) for comfortable weather and fewer crowds.",
        highlights=highlights,
        daily_plan=daily_plan,
        cozy_tips=tips,
        must_try_food=food_list,
        estimated_cost_breakdown=cost_breakdown,
    )


@app.get("/api/images")
def get_images(place: str = Query(...), per_page: int = Query(8)):
    try:
        images = get_place_images(place_name=place, per_page=per_page)
        return images
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
