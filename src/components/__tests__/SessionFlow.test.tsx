import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { TripProvider, useTripStore } from '../../state/tripStore';
import * as client from '../../api/client';

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

const TestSessionComponent = () => {
  const { state, submitTrip, reviseTrip } = useTripStore();
  return (
    <div>
      <div data-testid="session-id">{state.sessionId || 'NONE'}</div>
      <div data-testid="revision-count">{state.revisionHistory.length}</div>
      <button data-testid="gen-btn" onClick={() => submitTrip()}>Generate</button>
      <button data-testid="rev-btn" onClick={() => reviseTrip('Make it cheaper')}>Revise</button>
    </div>
  );
};

describe('Frontend Trip Session Synchronization Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('populates sessionId upon recommendation success', async () => {
    const mockRec = {
      destination: 'Goa',
      title: 'Goa Plan',
      tagline: 'Tagline',
      summary: 'Summary',
      best_time: 'Spring',
      highlights: [],
      daily_plan: [],
      cozy_tips: [],
      must_try_food: [],
      estimated_cost_breakdown: { accommodation: 10000, food: 5000, transport: 3000, activities: 2000, misc: 0 }
    };

    (client.fetchRecommendation as any).mockResolvedValue(mockRec);

    render(
      <TripProvider>
        <TestSessionComponent />
      </TripProvider>
    );

    fireEvent.click(screen.getByTestId('gen-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('session-id').textContent).not.toBe('NONE');
    });
  });

  it('appends to revisionHistory upon successful revision', async () => {
    const mockRec = {
      destination: 'Goa',
      title: 'Revised Goa Plan',
      tagline: 'Tagline',
      summary: 'Summary',
      best_time: 'Spring',
      highlights: [],
      daily_plan: [],
      cozy_tips: [],
      must_try_food: [],
      estimated_cost_breakdown: { accommodation: 8000, food: 4000, transport: 3000, activities: 2000, misc: 0 }
    };

    (client.fetchRecommendation as any).mockResolvedValue(mockRec);
    (client.reviseRecommendation as any).mockResolvedValue(mockRec);

    render(
      <TripProvider>
        <TestSessionComponent />
      </TripProvider>
    );

    // Initial trip submission
    fireEvent.click(screen.getByTestId('gen-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('session-id').textContent).not.toBe('NONE');
    });

    // Revision submission
    fireEvent.click(screen.getByTestId('rev-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('revision-count').textContent).toBe('1');
    });
  });
});
