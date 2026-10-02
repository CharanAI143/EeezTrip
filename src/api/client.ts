import { PlaceImage, Recommendation, TripPreferences, ExternalReview } from '../types';

const BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function fetchRecommendation(
  prefs: TripPreferences,
  signal?: AbortSignal
): Promise<Recommendation> {
  const timeoutMs = 30000;
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error('Trip recommendation request timed out. Please try again.')), timeoutMs);
  });

  try {
    const fetchPromise = (async () => {
      // Primary v2 architecture endpoint
      try {
        const v2Res = await fetch(`${BASE}/v1/recommendations/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(prefs),
          signal,
        });
        if (v2Res.ok) {
          return await v2Res.json();
        }
      } catch (e: any) {
        if (e.name === 'AbortError' || signal?.aborted) throw e;
        console.warn('V2 recommendation endpoint unavailable, attempting legacy fallback...');
      }

      // Legacy fallback endpoint
      const res = await fetch(`${BASE}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
        signal,
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
    })();

    return await Promise.race([fetchPromise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
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

/**
 * The backend forwards raw provider errors, so a transcription failure can look
 * like: `Audio transcription failed (RateLimitError): Error code: 429 - {...}`.
 * That is unreadable in a chat bubble and often names the wrong culprit, so the
 * known cases are mapped to something the user can act on.
 */
function humanizeTranscribeError(detail: string): string {
  const text = detail.toLowerCase();
  if (text.includes('insufficient_quota') || text.includes('credit_balance_exhausted') || text.includes('no credits remaining')) {
    return 'Voice input is unavailable right now — the transcription service has no credits left. Please try again later.';
  }
  if (text.includes('rate limit') || text.includes('429')) {
    return 'The transcription service is rate limiting requests. Please wait a moment and try again.';
  }
  if (text.includes('api key') || text.includes('authentication') || text.includes('401')) {
    return 'The transcription service rejected its credentials. Please check the server API key.';
  }
  if (text.includes('not configured')) {
    return 'Voice input is not configured on the server.';
  }
  if (text.includes('valid audio') || text.includes('empty')) {
    return 'That recording was too short or in an unsupported format.';
  }
  // Unknown provider noise: keep the leading clause only, it names the cause.
  const firstClause = detail.split(/[({]/)[0].trim();
  return firstClause.length > 0 && firstClause.length < 120
    ? firstClause
    : 'Voice input could not be processed.';
}

/**
 * MediaRecorder picks the container per browser (Chrome records webm, Safari
 * records mp4). The transcription providers choose their decoder from the
 * uploaded filename extension, so a hardcoded .webm would hand Whisper mp4
 * bytes and fail. Derive the extension from the real blob type instead.
 */
const AUDIO_EXTENSION_BY_MIME: Record<string, string> = {
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
  'audio/flac': 'flac',
  'audio/m4a': 'm4a',
};

function audioFilename(blob: Blob): string {
  // Strip codec parameters, e.g. 'audio/webm;codecs=opus'.
  const mime = (blob.type || '').split(';')[0].trim().toLowerCase();
  return `voice-input.${AUDIO_EXTENSION_BY_MIME[mime] ?? 'webm'}`;
}

export async function transcribeAudio(
  audioBlob: Blob,
  signal?: AbortSignal,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, audioFilename(audioBlob));

  let res: Response;
  try {
    res = await fetch(`${BASE}/transcribe`, {
      method: 'POST',
      body: formData,
      signal,
    });
  } catch (e: any) {
    // A dev-server proxy that cannot reach the API answers with an empty
    // text/plain body, so the old `err.detail || fallback` path reported
    // "unable to transcribe" for what is really an unreachable backend.
    if (e?.name === 'AbortError' || signal?.aborted) throw e;
    throw new Error(`Cannot reach the transcription API at ${BASE} — is the backend running?`);
  }

  if (!res.ok) {
    const body = await res.text();
    let detail: unknown;
    try {
      detail = JSON.parse(body)?.detail;
    } catch {
      detail = body;
    }
    // FastAPI validation errors arrive as an array of objects; only a scalar
    // detail is worth putting in front of a user.
    const reason = typeof detail === 'string' ? detail.trim() : '';
    throw new Error(reason ? humanizeTranscribeError(reason) : `Transcription failed (HTTP ${res.status})`);
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
  // Primary v2 architecture endpoint
  try {
    const v2Res = await fetch(`${BASE}/v1/trips/revise`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        preferences,
        current_plan: currentPlan,
        instruction,
      }),
      signal,
    });
    if (v2Res.ok) {
      const data = await v2Res.json();
      return data.revised_plan || data;
    }
  } catch (e: any) {
    if (e.name === 'AbortError' || signal?.aborted) throw e;
    console.warn('V2 revision endpoint unavailable, attempting legacy fallback...');
  }

  // Legacy fallback endpoint
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

/**
 * Google reviews for a destination, via the backend's SerpApi aggregation.
 *
 * Returns an empty list on any failure rather than throwing: this is the
 * signed-out visitor's view of a destination, and the page has to render with
 * first-party reviews either way.
 */
export async function fetchExternalReviews(destination: string): Promise<ExternalReview[]> {
  try {
    const res = await fetch(`${BASE}/reviews/external?destination=${encodeURIComponent(destination)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.reviews) ? data.reviews : [];
  } catch {
    return [];
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

export interface TravelInsightItem {
  category: string;
  title: string;
  message: string;
  badge: string;
  severity: string;
}

export interface TravelIntelligenceData {
  destination: string;
  weather_summary: any;
  insights: TravelInsightItem[];
}

export async function fetchTravelIntelligence(destination: string): Promise<TravelIntelligenceData | null> {
  try {
    const res = await fetch(`${BASE}/v1/intelligence/insights?destination=${encodeURIComponent(destination)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface ConciergeChatResponse {
  reply: string;
  detected_intent: string;
  confidence: number;
  action_taken: string;
  metadata?: any;
}

export async function sendConciergeChat(
  query: string,
  sessionId?: string
): Promise<ConciergeChatResponse> {
  const res = await fetch(`${BASE}/v1/concierge/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    throw new Error(
      typeof detail === 'string' ? detail : 'Unable to reach the travel concierge right now.'
    );
  }

  return res.json();
}

export interface BriefRecommendationItem {
  title: string;
  description: string;
  severity: 'INFO' | 'SUGGESTION' | 'IMPORTANT' | 'CRITICAL';
  action_type: string;
}

export interface DailyBriefData {
  destination: string;
  trip_health_score: {
    score: number;
    contributing_factors: any[];
    improvement_delta: number;
  };
  summary: string;
  sections: {
    weather: string[];
    transport: string[];
    events: string[];
    warnings: string[];
    opportunities: string[];
  };
  recommendations: BriefRecommendationItem[];
  can_optimize: boolean;
  generated_at: string;
}

export async function fetchDailyBrief(destination: string, sessionId?: string): Promise<DailyBriefData | null> {
  try {
    const url = sessionId
      ? `${BASE}/v1/daily-brief/today?destination=${encodeURIComponent(destination)}&session_id=${encodeURIComponent(sessionId)}`
      : `${BASE}/v1/daily-brief/today?destination=${encodeURIComponent(destination)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface BookingRecommendationItem {
  category: string;
  title: string;
  description: string;
  savings_amount: number;
  offer: {
    id: string;
    provider: string;
    category: string;
    title: string;
    price: number;
    currency: string;
    rating: number;
    location: string;
    distance_from_itinerary_km: number;
    cancellation_policy: string;
    booking_url: string;
  };
  severity: string;
}

export async function fetchBookingOpportunities(destination: string): Promise<BookingRecommendationItem[]> {
  try {
    const res = await fetch(`${BASE}/v1/booking/opportunities?destination=${encodeURIComponent(destination)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export interface UserProfileData {
  user_id: string;
  travel_style: { value: any; confidence: number; source: string; updated_at: string };
  budget_level: { value: any; confidence: number; source: string; updated_at: string };
  walking_preference: { value: any; confidence: number; source: string; updated_at: string };
  preferred_transport: { value: any; confidence: number; source: string; updated_at: string };
  hotel_style: { value: any; confidence: number; source: string; updated_at: string };
  activity_pacing: { value: any; confidence: number; source: string; updated_at: string };
  home_region: { value: any; confidence: number; source: string; updated_at: string };
  food_interest: { value: any; confidence: number; source: string; updated_at: string };
  nature_interest: { value: any; confidence: number; source: string; updated_at: string };
  museum_interest: { value: any; confidence: number; source: string; updated_at: string };
  favorite_categories: string[];
}

export async function fetchUserProfile(): Promise<UserProfileData | null> {
  try {
    const res = await fetch(`${BASE}/v1/personalization/profile`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateUserPreference(key: string, value: any): Promise<UserProfileData | null> {
  try {
    const res = await fetch(`${BASE}/v1/personalization/preferences?key=${encodeURIComponent(key)}&value=${encodeURIComponent(value)}`, {
      method: 'POST',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function resetUserProfile(): Promise<UserProfileData | null> {
  try {
    const res = await fetch(`${BASE}/v1/personalization/profile`, { method: 'DELETE' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
