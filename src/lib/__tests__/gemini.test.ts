import { describe, it, expect } from 'vitest';
import { moodFallback, MOOD_FALLBACK, __testing } from '../gemini';

describe('moodFallback', () => {
  it('returns three suggestions for every mood the UI offers', () => {
    for (const mood of ['relaxed', 'romantic', 'adventurous', 'nature', 'foodie']) {
      expect(moodFallback(mood, 50000, 'INR')).toHaveLength(3);
    }
  });

  it('has an explicit list for each offered mood rather than falling back', () => {
    for (const mood of ['relaxed', 'romantic', 'adventurous', 'nature', 'foodie']) {
      expect(MOOD_FALLBACK[mood]).toBeDefined();
    }
  });

  it('scales estimates to the budget', () => {
    const [first] = moodFallback('romantic', 10000, 'INR');
    // Budget is split across suggestions, so a tighter budget must not exceed
    // the curated figure for the top pick.
    expect(first.estimatedCost).toBeLessThanOrEqual(28000);
  });

  it('never returns a negative or zero estimate on a tiny budget', () => {
    for (const rec of moodFallback('foodie', 0, 'INR')) {
      expect(rec.estimatedCost).toBeGreaterThanOrEqual(1);
    }
  });

  it('names the currency in the description', () => {
    const [first] = moodFallback('relaxed', 50000, 'INR');
    expect(first.description).toContain('INR');
  });

  it('falls back to relaxed for an unknown mood', () => {
    expect(moodFallback('underwater-basket-weaving', 50000, 'INR'))
      .toEqual(moodFallback('relaxed', 50000, 'INR'));
  });

  it('gives every suggestion the fields the card renders', () => {
    for (const rec of moodFallback('adventurous', 50000, 'INR')) {
      expect(rec.name).toBeTruthy();
      expect(rec.whyMatch).toBeTruthy();
      expect(rec.highlight).toBeTruthy();
      expect(rec.landscapeType).toBeTruthy();
    }
  });

  it('has no duplicate destinations within a mood', () => {
    for (const mood of Object.keys(MOOD_FALLBACK)) {
      const names = MOOD_FALLBACK[mood].map(r => r.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe('voice regexExtraction', () => {
  const { regexExtraction } = __testing;

  it('extracts startLocation, destination, budget, duration and currency', () => {
    const res = regexExtraction('I want to go to Tokyo from Paris for 5 days with 5000 budget');
    expect(res.destination).toBe('Tokyo');
    expect(res.startLocation).toBe('Paris');
    expect(res.duration).toBe(5);
    expect(res.budget).toBe(5000);
  });

  it('handles "from X to Y" format with currency', () => {
    const res = regexExtraction('Plan a trip from London to Rome for 7 days under 2000 euros');
    expect(res.startLocation).toBe('London');
    expect(res.destination).toBe('Rome');
    expect(res.duration).toBe(7);
    expect(res.budget).toBe(2000);
    expect(res.currency).toBe('EUR');
  });

  it('handles Indian Rupee extraction with preferences', () => {
    const res = regexExtraction('Trip to Goa from Mumbai for 4 days with 35000 rupees for beaches and nightlife');
    expect(res.startLocation).toBe('Mumbai');
    expect(res.destination).toBe('Goa');
    expect(res.duration).toBe(4);
    expect(res.budget).toBe(35000);
    expect(res.currency).toBe('INR');
    expect(res.preferences).toContain('beaches');
    expect(res.preferences).toContain('nightlife');
  });
});

