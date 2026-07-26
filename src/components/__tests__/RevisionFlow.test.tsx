import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { TripProvider, useTripStore } from '../../state/tripStore';
import * as client from '../../api/client';
import { AiConcierge } from '../AiConcierge';

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

const mockInitialRec = {
  destination: 'Goa',
  title: 'Original Goa Plan',
  tagline: 'Tagline',
  summary: 'Summary',
  best_time: 'Spring',
  highlights: [],
  daily_plan: [],
  cozy_tips: [],
  must_try_food: [],
  estimated_cost_breakdown: { accommodation: 10000, food: 5000, transport: 3000, activities: 2000, misc: 0 }
};

const TestRevisionComponent = () => {
  const { state, setRecommendation } = useTripStore();

  React.useEffect(() => {
    if (!state.recommendation) {
      setRecommendation(mockInitialRec);
    }
  }, [state.recommendation, setRecommendation]);

  return (
    <div>
      <div data-testid="revising-status">{state.revising ? 'REVISING' : 'IDLE'}</div>
      <div data-testid="revise-error">{state.reviseError}</div>
      <div data-testid="plan-title">{state.recommendation?.title}</div>
      <AiConcierge />
    </div>
  );
};

describe('Frontend Revision Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers revision via quick action chip', async () => {
    const mockRevised = {
      destination: 'Goa',
      title: 'Cheaper Goa Escape',
      tagline: 'Budget friendly',
      summary: 'Revised for budget',
      best_time: 'Spring',
      highlights: [],
      daily_plan: [],
      cozy_tips: [],
      must_try_food: [],
      estimated_cost_breakdown: { accommodation: 8000, food: 4000, transport: 3000, activities: 2000, misc: 0 }
    };

    (client.reviseRecommendation as any).mockResolvedValue(mockRevised);

    render(
      <TripProvider>
        <TestRevisionComponent />
      </TripProvider>
    );

    // Open Concierge
    const toggleBtn = screen.getByRole('button');
    fireEvent.click(toggleBtn);

    // Click quick action chip "Make it cheaper"
    const chip = screen.getByText('Make it cheaper');
    fireEvent.click(chip);

    await waitFor(() => {
      expect(client.reviseRecommendation).toHaveBeenCalled();
    });
  });

  it('handles revision failure gracefully', async () => {
    (client.reviseRecommendation as any).mockRejectedValue(new Error('Revision model timeout'));

    render(
      <TripProvider>
        <TestRevisionComponent />
      </TripProvider>
    );

    // Open Concierge
    const toggleBtn = screen.getByRole('button');
    fireEvent.click(toggleBtn);

    const input = screen.getByPlaceholderText("e.g., 'Make day 2 kid-friendly'");
    fireEvent.change(input, { target: { value: 'Add more museums' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('revise-error').textContent).toBe('Revision model timeout');
    });
  });
});
