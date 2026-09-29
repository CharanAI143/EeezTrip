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

const VENUE_HINTS = [
  /\b(?:from|starting|leaving|origin|departing from)\s+([a-z][a-z\s]{2,30}?)(?=\s+(?:to|for|,|\.|with|$))/i,
  /\b(?:visit|go|going|travel|trip|plan|fly)\s+(?:to\s+)?([a-z][a-z\s]{2,30}?)(?=\s+(?:for|with|from|,|\.|$))/i,
];

const BUDGET_HINT = /(?:budget|for|under|around|rs\.?|inr|₹|\$)\s*([\d][\d,]{2,})/i;
const DURATION_HINT = /(\d{1,2})\s*(?:day|days|night|nights)/i;

/** Pull what we can out of a free-form transcript with regexes. */
function regexExtraction(text: string): ExtractedTripData {
  const data: ExtractedTripData = {};

  for (const pattern of VENUE_HINTS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = match[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
      if (pattern === VENUE_HINTS[0]) data.startLocation = value;
      else data.destination = value;
      break;
    }
  }

  const budget = text.match(BUDGET_HINT);
  if (budget?.[1]) data.budget = Number(budget[1].replace(/[^\d]/g, ''));

  const duration = text.match(DURATION_HINT);
  if (duration?.[1]) data.duration = Number(duration[1]);

  if (/\b(inr|rs\.?|rupees|₹)\b/i.test(text)) data.currency = 'INR';
  else if (/\b(usd|\$|dollars?)\b/i.test(text)) data.currency = 'USD';
  else if (/\b(eur|€)\b/i.test(text)) data.currency = 'EUR';
  else if (/\b(gbp|£)\b/i.test(text)) data.currency = 'GBP';

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
