import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { TripProvider, useTripStore } from '../../state/tripStore';
import * as client from '../../api/client';
import { RecommendationSkeleton } from '../RecommendationSkeleton';

vi.mock('../../lib/firebase', () => ({
  auth: { onAuthStateChanged: vi.fn(() => () => {}) },
  db: {},
  googleProvider: {},
}));

vi.mock('../../api/client', () => ({
  fetchRecommendation: vi.fn(),
  fetchImages: vi.fn().mockResolvedValue([]),
  reviseRecommendation: vi.fn(),
}));

const TestComponent = () => {
  const { state, submitTrip } = useTripStore();
  return (
    <div>
      <div data-testid="loading-state">{state.loading ? 'LOADING' : 'IDLE'}</div>
      <div data-testid="error-state">{state.error}</div>
      <button data-testid="submit-btn" onClick={() => submitTrip()}>
        Submit Trip
      </button>
      {state.loading && <RecommendationSkeleton />}
      {state.recommendation && (
        <div data-testid="result-title">{state.recommendation.title}</div>
      )}
    </div>
  );
};

describe('Frontend Recommendation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton loading state during generation', async () => {
    (client.fetchRecommendation as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500))
    );

    render(
      <TripProvider>
        <TestComponent />
      </TripProvider>
    );

    const btn = screen.getByTestId('submit-btn');
    fireEvent.click(btn);

    expect(screen.getByTestId('loading-state').textContent).toBe('LOADING');
  });

  it('handles recommendation success cleanly', async () => {
    const mockRec = {
      destination: 'Goa',
      title: 'Relaxed Goa Escape',
      tagline: 'Unplug & unwind',
      summary: '3 days in Goa',
      best_time: 'Spring',
      highlights: ['Beach', 'Sunset'],
      daily_plan: [],
      cozy_tips: [],
      must_try_food: [],
      estimated_cost_breakdown: {
        accommodation: 10000,
        food: 5000,
        transport: 3000,
        activities: 2000,
        misc: 0,
      },
    };

    (client.fetchRecommendation as any).mockResolvedValue(mockRec);

    render(
      <TripProvider>
        <TestComponent />
      </TripProvider>
    );

    const btn = screen.getByTestId('submit-btn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('IDLE');
    });

    expect(screen.getByTestId('result-title').textContent).toBe('Relaxed Goa Escape');
  });

  it('handles recommendation failure and error state', async () => {
    (client.fetchRecommendation as any).mockRejectedValue(
      new Error('API quota exceeded')
    );

    render(
      <TripProvider>
        <TestComponent />
      </TripProvider>
    );

    const btn = screen.getByTestId('submit-btn');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId('error-state').textContent).toBe('API quota exceeded');
    });
  });
});
