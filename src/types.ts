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

export type Page = 'landing' | 'choice' | 'start' | 'mood-start' | 'preferences' | 'results' | 'booking' | 'dashboard' | 'reviews';

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
