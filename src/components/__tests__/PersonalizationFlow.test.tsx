import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as client from '../../api/client';
import { PreferenceConfidenceIndicator } from '../PreferenceConfidenceIndicator';
import { LearningInsightsCard } from '../LearningInsightsCard';

vi.mock('../../api/client', () => ({
  fetchUserProfile: vi.fn(),
  resetUserProfile: vi.fn(),
}));

describe('Frontend Personalization Component Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PreferenceConfidenceIndicator correctly', () => {
    render(<PreferenceConfidenceIndicator confidence={0.85} source="BEHAVIOR" />);
    expect(screen.getByText(/85% Confidence · Learned Behavior/i)).toBeDefined();
  });

  it('renders LearningInsightsCard with user preferences', async () => {
    const mockProfile = {
      user_id: 'anonymous',
      travel_style: { value: 'balanced', confidence: 0.8, source: 'EXPLICIT', updated_at: '2026-07-26T00:00:00Z' },
      budget_level: { value: 'moderate', confidence: 0.8, source: 'EXPLICIT', updated_at: '2026-07-26T00:00:00Z' },
      walking_preference: { value: 'moderate', confidence: 0.7, source: 'BEHAVIOR', updated_at: '2026-07-26T00:00:00Z' },
      preferred_transport: { value: 'public_transit', confidence: 0.75, source: 'BEHAVIOR', updated_at: '2026-07-26T00:00:00Z' },
      hotel_style: { value: 'boutique', confidence: 0.85, source: 'BEHAVIOR', updated_at: '2026-07-26T00:00:00Z' },
      activity_pacing: { value: 'relaxed', confidence: 0.9, source: 'EXPLICIT', updated_at: '2026-07-26T00:00:00Z' },
      food_interest: { value: 0.85, confidence: 0.9, source: 'BEHAVIOR', updated_at: '2026-07-26T00:00:00Z' },
      nature_interest: { value: 0.7, confidence: 0.7, source: 'BEHAVIOR', updated_at: '2026-07-26T00:00:00Z' },
      museum_interest: { value: 0.5, confidence: 0.6, source: 'BEHAVIOR', updated_at: '2026-07-26T00:00:00Z' },
      favorite_categories: ['Food & Culinary'],
    };

    (client.fetchUserProfile as any).mockResolvedValue(mockProfile);

    render(<LearningInsightsCard />);

    await waitFor(() => {
      expect(screen.getByText('Personalization & Transparent Learning Engine')).toBeDefined();
      expect(screen.getByText('Food & Culinary')).toBeDefined();
    });
  });
});
