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

export type Page = 'landing' | 'choice' | 'start' | 'mood-start' | 'mood-destination' | 'preferences' | 'results' | 'booking' | 'dashboard' | 'reviews';

// ─── Database Records ───────────────────────────────────────────────────────

export type Review = {
  id?: string;
  user_id?: string;
  destination: string;
  rating: number;
  comment: string;
  video_url?: string | null;
  created_at?: string;
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

export type DestinationReview = {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string | null;
  destination: string;
  rating: number;
  review: string;
  videoUrl?: string | null;
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

