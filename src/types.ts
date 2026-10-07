import { z } from 'zod';

// ─── Trip Request ────────────────────────────────────────────────────────────

export type TripPreferences = {
  planningType: 'detailed' | 'mood';
  origin: string;
  destination: string;
  mood: string;
  budget: number;
  days: number;
  startDate: string;
  endDate: string;
  mode: 'normal' | 'deep';
};

export type TripRequest = {
  origin: string;
  destination: string;
  mood: string;
  budget: number;
  days: number;
  startDate: string;
  endDate: string;
  mode: 'normal' | 'deep';
};

// ─── API Response Types ──────────────────────────────────────────────────────

export type DayPlan = {
  day: number;
  title: string;
  morning: string;
  midday: string;
  afternoon: string;
  evening: string;
  tip: string;
  /** Optional accommodation suggestion for the night of this day. */
  stay?: string;
};

export type CostBreakdown = {
  accommodation: number;
  food: number;
  transport: number;
  activities: number;
  misc: number;
};

export type Recommendation = {
  destination?: string;
  title: string;
  tagline: string;
  summary: string;
  best_time: string;
  highlights: string[];
  daily_plan: DayPlan[];
  cozy_tips: string[];
  must_try_food: string[];
  estimated_cost_breakdown: CostBreakdown;
};

export type PlaceImage = {
  image_id: string;
  url: string;
  url_regular?: string;
  url_small?: string;
  alt: string;
  author: string;
  source: string;
  source_link?: string;
};

// ─── Navigation ─────────────────────────────────────────────────────────────

export type Page = 'landing' | 'choice' | 'start' | 'mood-start' | 'mood-destination' | 'preferences' | 'results' | 'booking' | 'dashboard' | 'reviews' | 'auth';

// ─── Database Records ───────────────────────────────────────────────────────

/**
 * A review written by a signed-in traveller, stored in Firestore.
 *
 * `tripId`/`tripTitle` are what connect a review back to the trip it was
 * written about, so a review can be surfaced on that trip rather than only in
 * the global feed. Both are optional: a traveller can review a destination they
 * visited outside the app.
 */
export type DestinationReview = {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  destination: string;
  rating: number;
  review: string;
  videoUrl?: string | null;
  tripId?: string | null;
  tripTitle?: string | null;
  createdAt?: FirestoreTimestamp;
};

/**
 * A review aggregated from a third-party source (Google, Tripadvisor,
 * MakeMyTrip, Booking.com) via the backend, shown to signed-out visitors.
 *
 * Deliberately a different shape from `DestinationReview`: it is read-only,
 * carries no `userId`, and is attributed to a place rather than a person, so it
 * can never be mistaken for something a traveller wrote.
 */
export type ExternalReviewSource = 'google' | 'tripadvisor' | 'makemytrip' | 'booking';

export type ExternalReview = {
  author: string;
  rating: number | null;
  text: string;
  /** When the reviewer visited, as reported by the source. Often relative, e.g. "2 years ago". */
  visitedAt?: string | null;
  /** How many reviews the place has in total, when the source reports it. */
  totalReviews?: number | null;
  /** Average rating across all of the place's reviews from this source. */
  averageRating?: number | null;
  placeName: string;
  /** Which site this review came from. Absent on legacy responses. */
  source?: ExternalReviewSource;
  /** Deep link to the original review, when the source provides one. */
  url?: string | null;
};

/**
 * The full payload of `/api/reviews/external`: every source's reviews, the
 * same reviews bucketed by source, and outbound links for "read more" affordances.
 */
export type ExternalReviewsBundle = {
  destination: string;
  reviews: ExternalReview[];
  sources: Partial<Record<ExternalReviewSource, ExternalReview[]>>;
  links: Partial<Record<ExternalReviewSource, string>>;
  count: number;
  /**
   * Sources that errored instead of answering. Empty means every source was
   * heard from, so a `count` of 0 really is "nobody has reviewed this place"
   * — and inviting the visitor to write the first review is honest.
   */
  failed: ExternalReviewSource[];
};

export type TripRecord = {
  id: string;
  user_id: string;
  label: string;
  destination: string;
  trip: Recommendation;
  preferences?: TripPreferences;
  created_at: string;
};

// ─── Mood Option ─────────────────────────────────────────────────────────────

export type MoodOption = {
  id: string;
  label: string;
  imageUrl: string;
  description: string;
  color: string;
  pinkAccent?: boolean;
};

// ─── Map Markers ─────────────────────────────────────────────────────────────

export type MapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  day?: number;
  time?: string;
  description?: string;
  category?: string;
};

// ─── Firestore-backed Collections ────────────────────────────────────────────

/** Firestore `serverTimestamp()` placeholders resolve to a `Timestamp` on read. */
export type FirestoreTimestamp = Date | string | number | { toDate?: () => Date } | null;

export type SavedTrip = {
  id: string;
  userId: string;
  title: string;
  destination: string;
  content: string;
  createdAt?: FirestoreTimestamp;
};

// ─── Trip Form Options ───────────────────────────────────────────────────────

export const Currency = {
  options: ['USD', 'INR', 'EUR', 'GBP', 'AED', 'SGD', 'THB', 'JPY', 'AUD', 'CAD'],
} as const;
export type Currency = (typeof Currency.options)[number];

export const TravelStyle = {
  options: ['budget', 'mid-range', 'luxury', 'backpacking'],
} as const;
export type TravelStyle = (typeof TravelStyle.options)[number];

export const Preference = {
  options: ['beaches', 'mountains', 'food', 'culture', 'nightlife', 'nature', 'shopping', 'history'],
} as const;
export type Preference = (typeof Preference.options)[number];

export const TripType = {
  options: ['leisure', 'adventure', 'romantic', 'business', 'family', 'solo', 'backpacking'],
} as const;
export type TripType = (typeof TripType.options)[number];

export const TripFormSchema = z.object({
  startLocation: z.string().min(2, 'Start location is required'),
  destination: z.string().min(2, 'Destination is required'),
  duration: z.coerce.number().int().min(1).max(30),
  guests: z.coerce.number().int().min(1),
  currency: z.string(),
  budget: z.coerce.number().min(0),
  travelStyle: z.string(),
  preferences: z.array(z.string()).default([]),
  tripTypes: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export type TripFormData = z.infer<typeof TripFormSchema>;

