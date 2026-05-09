import { PlaceImage, Recommendation, TripPreferences } from '../types';

const BASE = '/api';

export async function fetchRecommendation(prefs: TripPreferences): Promise<Recommendation> {
  const res = await fetch(`${BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(prefs),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Unable to generate recommendation right now.');
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
