import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useEffect } from 'react';
import { TripProvider, useTripStore } from '../../state/tripStore';
import * as client from '../../api/client';
import { DailyBriefScreen } from '../DailyBriefScreen';

vi.mock('../../lib/firebase', () => ({
  auth: { onAuthStateChanged: vi.fn(() => () => {}) },
  db: {},
  googleProvider: {},
}));

vi.mock('../../api/client', () => ({
  fetchRecommendation: vi.fn(),
  fetchImages: vi.fn().mockResolvedValue([]),
  reviseRecommendation: vi.fn(),
  fetchDailyBrief: vi.fn(),
}));

const TestWrapperWithRecommendation = ({ children }: { children: React.ReactNode }) => {
  const { dispatch } = useTripStore();
  useEffect(() => {
    dispatch({
      type: 'SUBMIT_SUCCESS',
      recommendation: {
        destination: 'Goa',
        title: 'Goa Trip',
        tagline: 'Tagline',
        summary: 'Summary',
        best_time: 'Spring',
        highlights: [],
        daily_plan: [],
        cozy_tips: [],
        must_try_food: [],
        estimated_cost_breakdown: { accommodation: 10000, food: 5000, transport: 3000, activities: 2000, misc: 0 }
      },
      images: []
    });
  }, [dispatch]);
  return <>{children}</>;
};

describe('Frontend Daily Brief & Trip Health Component Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (client.fetchDailyBrief as any).mockImplementation(() => new Promise(() => {}));

    render(
      <TripProvider>
        <DailyBriefScreen destination="Goa" />
      </TripProvider>
    );

    expect(screen.getByText(/Generating your Smart Daily Briefing/i)).toBeDefined();
  });

  it('renders daily brief summary and trip health score', async () => {
    const mockBrief = {
      destination: 'Goa',
      trip_health_score: {
        score: 91,
        contributing_factors: [{ category: 'Weather', impact: 0, detail: 'Optimal weather conditions.' }],
        improvement_delta: 9,
      },
      summary: 'Good Morning! Your trip health score for Goa today is 91/100.',
      sections: { weather: [], transport: [], events: [], warnings: [], opportunities: [] },
      recommendations: [],
      can_optimize: true,
      generated_at: '2026-07-26T00:00:00Z',
    };

    (client.fetchDailyBrief as any).mockResolvedValue(mockBrief);

    render(
      <TripProvider>
        <DailyBriefScreen destination="Goa" />
      </TripProvider>
    );

    const titleEl = await screen.findByText('Good Morning, Traveler!');
    expect(titleEl).toBeDefined();

    const scoreTitle = await screen.findByText('Trip Health Score');
    expect(scoreTitle).toBeDefined();
  });

  it('triggers revision flow when Optimize My Day button is clicked', async () => {
    const mockBrief = {
      destination: 'Goa',
      trip_health_score: {
        score: 75,
        contributing_factors: [{ category: 'Weather', impact: -18, detail: 'Rain expected.' }],
        improvement_delta: 25,
      },
      summary: 'Rain expected in Goa today.',
      sections: { weather: [], transport: [], events: [], warnings: [], opportunities: [] },
      recommendations: [
        {
          title: 'Rain Advisory',
          description: 'Swap outdoor walks with museum visits.',
          severity: 'CRITICAL',
          action_type: 'weather_opt',
        },
      ],
      can_optimize: true,
      generated_at: '2026-07-26T00:00:00Z',
    };

    (client.fetchDailyBrief as any).mockResolvedValue(mockBrief);
    (client.reviseRecommendation as any).mockResolvedValue({
      destination: 'Goa',
      title: 'Revised Goa Trip',
      tagline: 'Tagline',
      summary: 'Summary',
      best_time: 'Spring',
      highlights: [],
      daily_plan: [],
      cozy_tips: [],
      must_try_food: [],
      estimated_cost_breakdown: { accommodation: 8000, food: 4000, transport: 3000, activities: 2000, misc: 0 }
    });

    render(
      <TripProvider>
        <TestWrapperWithRecommendation>
          <DailyBriefScreen destination="Goa" />
        </TestWrapperWithRecommendation>
      </TripProvider>
    );

    const btn = await screen.findByText('⚡ Optimize My Day');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(client.reviseRecommendation).toHaveBeenCalled();
    });
  });
});
