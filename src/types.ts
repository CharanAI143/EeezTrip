// ─── Trip Request ────────────────────────────────────────────────────────────

export type TripPreferences = {
  origin: string;
  destination: string;
  mood: string;
  budget: number;
  days: number;
  mode: 'normal' | 'deep';
};

export type TripRequest = {
  origin: string;
  destination: string;
  mood: string;
  budget: number;
  days: number;
  mode: 'normal' | 'deep';
};

// ─── API Response Types ──────────────────────────────────────────────────────

export type DayPlan = {
  day: number;
  title: string;
  morning: string;
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

export type Page = 'landing' | 'start' | 'preferences' | 'results';

// ─── Mood Option ─────────────────────────────────────────────────────────────

export type MoodOption = {
  id: string;
  label: string;
  imageUrl: string;
  description: string;
  color: string;
  pinkAccent?: boolean;
};
