import { PlaceImage, Recommendation, TripPreferences } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchRecommendation(prefs: TripPreferences): Promise<Recommendation> {
  const res = await fetch(`${BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    let errMsg = 'Unable to generate recommendation right now.';
    if (err.detail) {
      errMsg = typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail);
    }
    throw new Error(errMsg);
  }

  return res.json();
}

export async function fetchImages(
  destination: string,
  perPage = 8,
): Promise<PlaceImage[]> {
  try {
    const res = await fetch(
      `${BASE}/images?place=${encodeURIComponent(destination)}&per_page=${perPage}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export interface WeatherData {
  temperature_max: number;
  temperature_min: number;
  condition: string;
  is_day: number;
  needs_alternatives: boolean;
}

export async function fetchWeather(destination: string): Promise<WeatherData | null> {
  try {
    const res = await fetch(`${BASE}/weather?place=${encodeURIComponent(destination)}`);
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export interface ChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function fetchChatReply(
  messages: ChatMessagePayload[],
  signal?: AbortSignal,
): Promise<string> {
  const timeoutMs = 120000;
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Request timed out. Please try again.')), timeoutMs);
  });

  try {
    const fetchPromise = fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal,
    });
    const res = await Promise.race([fetchPromise, timeoutPromise]);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Unable to generate chat reply right now.');
    }

    const data = await res.json();
    return data.reply || '';
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

export async function transcribeAudio(
  audioBlob: Blob,
  signal?: AbortSignal,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice-input.webm');

  const res = await fetch(`${BASE}/transcribe`, {
    method: 'POST',
    body: formData,
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Unable to transcribe audio right now.');
  }

  const data = await res.json();
  return data.transcript || '';
}

export async function reviseRecommendation(
  preferences: TripPreferences,
  currentPlan: Recommendation,
  instruction: string,
  signal?: AbortSignal,
): Promise<Recommendation> {
  const res = await fetch(`${BASE}/recommend/revise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      preferences,
      current_plan: currentPlan,
      instruction,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Unable to revise itinerary right now.');
  }

  return res.json();
}

export async function fetchWeatherAlternatives(
  destination: string,
  condition: string,
  mood: string,
  signal?: AbortSignal,
): Promise<{ alternatives: string[] }> {
  const res = await fetch(`${BASE}/weather/alternatives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination, condition, mood }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Unable to fetch alternative plans.');
  }

  return res.json();
}

export async function fetchReviews(destination?: string): Promise<any[]> {
  const url = destination ? `${BASE}/reviews?destination=${encodeURIComponent(destination)}` : `${BASE}/reviews`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.reviews || [];
  } catch {
    return [];
  }
}

export async function submitReview(review: any): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTripsFromDB(userId: string = "all"): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}/trips?user_id=${encodeURIComponent(userId)}&limit=50`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.trips || [];
  } catch {
    return [];
  }
}
