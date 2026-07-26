import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { TravelInsightsCard } from '../TravelInsightsCard';
import * as client from '../../api/client';

vi.mock('../../api/client', () => ({
  fetchTravelIntelligence: vi.fn(),
}));

describe('Frontend Travel Intelligence Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (client.fetchTravelIntelligence as any).mockImplementation(
      () => new Promise(() => {})
    );

    render(<TravelInsightsCard destination="Goa" />);
    expect(screen.getByText(/Fetching real-time travel intelligence insights/i)).toBeDefined();
  });

  it('renders insights cards upon successful fetch', async () => {
    const mockData = {
      destination: 'Goa',
      weather_summary: { temp_max: 29.5 },
      insights: [
        {
          category: 'weather',
          title: 'Ideal Outdoor Weather',
          message: 'Clear skies in Goa',
          badge: 'Weather Ideal',
          severity: 'success',
        },
        {
          category: 'transit',
          title: 'Prefer Metro Transit',
          message: 'Traffic near beach road',
          badge: 'Transit Tip',
          severity: 'info',
        },
      ],
    };

    (client.fetchTravelIntelligence as any).mockResolvedValue(mockData);

    render(<TravelInsightsCard destination="Goa" />);

    await waitFor(() => {
      expect(screen.getByText('Ideal Outdoor Weather')).toBeDefined();
      expect(screen.getByText('Prefer Metro Transit')).toBeDefined();
    });
  });
});
