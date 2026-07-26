import { useState, useRef, useCallback } from 'react';
import { fetchRecommendation } from '../api/client';
import { Recommendation, TripPreferences } from '../types';

export function useTripRecommendation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPrefsRef = useRef<TripPreferences | null>(null);

  const generateRecommendation = useCallback(async (prefs: TripPreferences) => {
    // Abort active pending request if user submits again
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastPrefsRef.current = prefs;

    setLoading(true);
    setError('');

    try {
      const result = await fetchRecommendation(prefs, controller.signal);
      setRecommendation(result);
      return result;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Recommendation request cancelled.');
        return null;
      }
      const msg = err instanceof Error ? err.message : 'Unable to generate itinerary right now.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    if (lastPrefsRef.current) {
      return generateRecommendation(lastPrefsRef.current);
    }
  }, [generateRecommendation]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    recommendation,
    generateRecommendation,
    retry,
    cancel,
    setRecommendation,
  };
}
