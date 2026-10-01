import type { TripFormData } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const MOOD_LANDSCAPES = ['beach', 'mountain', 'city', 'culture', 'desert', 'island'] as const;

export type MoodChoice = {
  name: string;
  description: string;
  whyMatch: string;
  estimatedCost: number;
  landscapeType: string;
  highlight: string;
};

export type SeasonalDestination = {
  name: string;
  description: string;
  highlight: string;
  type: 'nature' | 'city' | 'beach' | 'culture';
};

export type SeasonalData = {
  nearby: SeasonalDestination[];
  national: SeasonalDestination[];
  global: SeasonalDestination[];
};

export type ExtractedTripData = Partial<
  Pick<TripFormData, 'startLocation' | 'destination' | 'budget' | 'currency' | 'duration'>
> & {
  tripTypes?: string[];
  preferences?: string[];
};

type Fallback = Record<string, unknown> | null;

async function requestStructured<T>(path: string, body: unknown, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${path} failed with ${res.status}`);
    return (await res.json()) as T;
  } catch (error) {
    console.warn(`[gemini] ${path} unavailable, using local fallback.`, error);
    return fallback;
  }
}

/** Strip a fenced/block-wrapped JSON payload down to its object body. */
function parseJson(raw: string): Fallback {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.trim()) return value.split(/[,\n]/).map((v) => v.trim()).filter(Boolean);
  return [];
}

export const MOOD_FALLBACK: Record<string, MoodChoice[]> = {
  adventurous: [
    { name: 'Rishikesh', description: 'Riverside ashrams and Himalayan treks.', whyMatch: 'Adrenaline meets stillness.', estimatedCost: 18000, landscapeType: 'mountain', highlight: 'Ganga rafting' },
    { name: 'Manali', description: 'Snow peaks, paragliding, and mountain passes.', whyMatch: 'Pure mountain energy.', estimatedCost: 22000, landscapeType: 'mountain', highlight: 'Adventure capital' },
    { name: 'Ladakh', description: 'High-altitude deserts and cold-desert camps.', whyMatch: 'The edge of the map.', estimatedCost: 35000, landscapeType: 'desert', highlight: 'Road trip heaven' },
  ],
  relaxed: [
    { name: 'Goa', description: 'Quiet beaches, shacks, and unhurried sunsets.', whyMatch: 'Zero planning required.', estimatedCost: 20000, landscapeType: 'beach', highlight: 'Slow living' },
    { name: 'Udaipur', description: 'Lakes, palaces, and calm boat rides.', whyMatch: 'Romance without the rush.', estimatedCost: 18000, landscapeType: 'culture', highlight: 'City of lakes' },
    { name: 'Coorg', description: 'Coffee estates, waterfalls, and cool weather.', whyMatch: 'Green reset for busy minds.', estimatedCost: 15000, landscapeType: 'nature', highlight: 'Scotland of India' },
  ],
  romantic: [
    { name: 'Kerala', description: 'Backwaters, houseboats, and lush green.', whyMatch: 'Made for two.', estimatedCost: 28000, landscapeType: 'nature', highlight: 'Backwater escape' },
    { name: 'Andaman', description: 'Clear water, quiet coves, and reef snorkelling.', whyMatch: 'Private island days.', estimatedCost: 42000, landscapeType: 'island', highlight: 'Untouched shores' },
    { name: 'Udaipur', description: 'Sunset cruises over still water.', whyMatch: 'Every view is a postcard.', estimatedCost: 18000, landscapeType: 'culture', highlight: 'Palace romance' },
  ],
  nature: [
    { name: 'Coorg', description: 'Coffee estates, waterfalls, and cool weather.', whyMatch: 'Green reset for busy minds.', estimatedCost: 15000, landscapeType: 'nature', highlight: 'Scotland of India' },
    { name: 'Rishikesh', description: 'Riverbanks, forest trails, and river gorges.', whyMatch: 'Air and altitude, close together.', estimatedCost: 18000, landscapeType: 'mountain', highlight: 'Ganga rafting' },
    { name: 'Munnar', description: 'Tea slopes, misted valleys, and quiet viewpoints.', whyMatch: 'Green, cool, unhurried.', estimatedCost: 16000, landscapeType: 'nature', highlight: 'Tea country' },
  ],
  foodie: [
    { name: 'Amritsar', description: 'Old-city lanes, langar, and a famous kulcha.', whyMatch: 'A pilgrimage for your palate.', estimatedCost: 12000, landscapeType: 'culture', highlight: 'Golden temple langar' },
    { name: 'Goa', description: 'Beach shacks, fish curry, and late-night grills.', whyMatch: 'Every night a different meal.', estimatedCost: 20000, landscapeType: 'beach', highlight: 'Coastal kitchens' },
    { name: 'Jaipur', description: 'Bazaars, rooftop chais, and Rajasthani thalis.', whyMatch: 'Spice, colour, and generous plates.', estimatedCost: 17000, landscapeType: 'culture', highlight: 'Old city bazaars' },
  ],
};

export function moodFallback(mood: string, budget: number, currency: string): MoodChoice[] {
  const key = mood.trim().toLowerCase();
  const seeded = MOOD_FALLBACK[key] ?? MOOD_FALLBACK.relaxed;
  return seeded.map((choice, index) => ({
    ...choice,
    estimatedCost: Math.min(choice.estimatedCost, Math.max(1, Math.round(budget / (index + 2)))),
    description: `${choice.description} Budgeted in ${currency}.`,
  }));
}

export async function getMoodRecommendations(
  mood: string,
  budget: number,
  currency: string
): Promise<MoodChoice[]> {
  const result = await requestStructured<MoodChoice[] | Fallback>(
    '/v1/recommendations/mood',
    { mood, budget, currency, count: 3 },
    null
  );
  if (Array.isArray(result) && result.length > 0) return result;
  return moodFallback(mood, budget, currency);
}

export async function getSeasonalRecommendations(userLocation: string): Promise<SeasonalData> {
  const empty: SeasonalData = { nearby: [], national: [], global: [] };
  const result = await requestStructured<SeasonalData | Fallback>(
    '/v1/recommendations/seasonal',
    { location: userLocation, month: new Date().getMonth() + 1 },
    null
  );
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const data = result as SeasonalData;
    return {
      nearby: Array.isArray(data.nearby) ? data.nearby : [],
      national: Array.isArray(data.national) ? data.national : [],
      global: Array.isArray(data.global) ? data.global : [],
    };
  }
  return empty;
}

const START_HINTS = [
  /\b(?:from|starting\s+(?:from|at)|leaving\s+(?:from)?|originating\s+(?:from|at)?|departing\s+(?:from)?|out\s+of)\s+([a-zA-Z][a-zA-Z\s]{1,30}?)(?=\s+(?:to|for|with|in|on|under|around|budget|,|\.|$))/i,
  /\b([a-zA-Z][a-zA-Z\s]{1,24}?)\s+to\s+([a-zA-Z][a-zA-Z\s]{1,24}?)(?=\s+(?:for|with|in|under|around|budget|,|\.|$))/i,
];

const DEST_HINTS = [
  /\b(?:to\s+(?!visit\b|go\b|going\b|travel\b|head\b|fly\b|plan\b|trip\b))([a-zA-Z][a-zA-Z\s]{1,30}?)(?=\s+(?:from|for|with|in|on|under|around|budget|,|\.|$))/i,
  /\b(?:visit|visiting|go\s+to|going\s+to|travel\s+to|trip\s+to|fly\s+to|flying\s+to|head\s+to|explore)\s+([a-zA-Z][a-zA-Z\s]{1,30}?)(?=\s+(?:from|for|with|in|on|under|around|budget|,|\.|$))/i,
];

const BUDGET_HINT = /(?:budget(?:\s+is|\s+of|\s*:)?|under|around|approx(?:imately)?|rs\.?|inr|₹|\$|€|£)\s*([\d][\d,]{2,})/i;
const BUDGET_REVERSE_HINT = /([\d][\d,]{2,})\s*(?:budget|rupees?|rs\.?|inr|₹|\$|dollars?|bucks|euros?|€|pounds?|£)/i;
const DURATION_DAYS_HINT = /(\d{1,2})\s*(?:day|days|night|nights)/i;
const DURATION_WEEKS_HINT = /(\d{1,2})\s*(?:week|weeks)/i;

const PREF_KEYWORDS: Record<string, string> = {
  beach: 'beaches',
  beaches: 'beaches',
  mountain: 'mountains',
  mountains: 'mountains',
  food: 'food',
  foodie: 'food',
  culture: 'culture',
  cultural: 'culture',
  nightlife: 'nightlife',
  party: 'nightlife',
  nature: 'nature',
  shopping: 'shopping',
  history: 'history',
  historical: 'history',
};

const TRIP_TYPE_KEYWORDS: Record<string, string> = {
  leisure: 'leisure',
  relax: 'leisure',
  relaxed: 'leisure',
  adventure: 'adventure',
  adventurous: 'adventure',
  romantic: 'romantic',
  honeymoon: 'romantic',
  business: 'business',
  work: 'business',
  family: 'family',
  kids: 'family',
  solo: 'solo',
  alone: 'solo',
  backpacking: 'backpacking',
  budget: 'backpacking',
};

function titleCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Pull what we can out of a free-form transcript with regexes. */
function regexExtraction(text: string): ExtractedTripData {
  const data: ExtractedTripData = {};
  if (!text || !text.trim()) return data;

  const cleanText = text.trim();

  // Try extracting start location
  for (const pattern of START_HINTS) {
    const match = cleanText.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].trim();
      if (!/^(?:visit|go|travel|trip|plan|fly)$/i.test(candidate)) {
        data.startLocation = titleCase(candidate);
        if (match[2] && !data.destination) {
          data.destination = titleCase(match[2].trim());
        }
        break;
      }
    }
  }

  // Try extracting destination if not already found
  if (!data.destination) {
    for (const pattern of DEST_HINTS) {
      const match = cleanText.match(pattern);
      if (match?.[1]) {
        const candidate = match[1].trim();
        if (candidate.toLowerCase() !== data.startLocation?.toLowerCase()) {
          data.destination = titleCase(candidate);
          break;
        }
      }
    }
  }

  // Budget
  const budgetMatch = cleanText.match(BUDGET_HINT) || cleanText.match(BUDGET_REVERSE_HINT);
  if (budgetMatch?.[1]) {
    const parsedBudget = Number(budgetMatch[1].replace(/[^\d]/g, ''));
    if (!Number.isNaN(parsedBudget) && parsedBudget > 0) {
      data.budget = parsedBudget;
    }
  }

  // Duration
  const daysMatch = cleanText.match(DURATION_DAYS_HINT);
  if (daysMatch?.[1]) {
    data.duration = Number(daysMatch[1]);
  } else {
    const weeksMatch = cleanText.match(DURATION_WEEKS_HINT);
    if (weeksMatch?.[1]) {
      data.duration = Number(weeksMatch[1]) * 7;
    }
  }

  // Currency
  if (/\b(inr|rs\.?|rupees?|₹)\b/i.test(cleanText)) data.currency = 'INR';
  else if (/\b(usd|\$|dollars?|bucks)\b/i.test(cleanText)) data.currency = 'USD';
  else if (/\b(eur|€|euros?)\b/i.test(cleanText)) data.currency = 'EUR';
  else if (/\b(gbp|£|pounds?)\b/i.test(cleanText)) data.currency = 'GBP';
  else if (/\b(aed|dirhams?)\b/i.test(cleanText)) data.currency = 'AED';
  else if (/\b(cad|canadian dollars?)\b/i.test(cleanText)) data.currency = 'CAD';
  else if (/\b(aud|australian dollars?)\b/i.test(cleanText)) data.currency = 'AUD';
  else if (/\b(jpy|yen|¥)\b/i.test(cleanText)) data.currency = 'JPY';
  else if (/\b(sgd|singapore dollars?)\b/i.test(cleanText)) data.currency = 'SGD';

  // Preferences
  const foundPrefs = new Set<string>();
  for (const [kw, pref] of Object.entries(PREF_KEYWORDS)) {
    const reg = new RegExp(`\\b${kw}\\b`, 'i');
    if (reg.test(cleanText)) {
      foundPrefs.add(pref);
    }
  }
  if (foundPrefs.size > 0) {
    data.preferences = Array.from(foundPrefs);
  }

  // Trip Types
  const foundTypes = new Set<string>();
  for (const [kw, type] of Object.entries(TRIP_TYPE_KEYWORDS)) {
    const reg = new RegExp(`\\b${kw}\\b`, 'i');
    if (reg.test(cleanText)) {
      foundTypes.add(type);
    }
  }
  if (foundTypes.size > 0) {
    data.tripTypes = Array.from(foundTypes);
  }

  return data;
}

export async function extractTripDataFromVoice(text: string): Promise<ExtractedTripData> {
  const fallback = regexExtraction(text);
  const result = await requestStructured<Fallback>('/v1/voice/extract', { transcript: text }, null);
  if (!result) return fallback;

  const merged: ExtractedTripData = { ...fallback };
  for (const key of ['startLocation', 'destination', 'currency'] as const) {
    if (typeof result[key] === 'string' && result[key]) merged[key] = result[key] as string;
  }
  for (const key of ['budget', 'duration'] as const) {
    if (typeof result[key] === 'number' && Number.isFinite(result[key])) merged[key] = result[key] as number;
  }
  const tripTypes = asList(result.tripTypes);
  if (tripTypes.length) merged.tripTypes = tripTypes;
  const preferences = asList(result.preferences);
  if (preferences.length) merged.preferences = preferences;

  return merged;
}

export const __testing = { parseJson, regexExtraction, MOOD_LANDSCAPES };
