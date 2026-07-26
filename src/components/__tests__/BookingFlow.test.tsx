import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as client from '../../api/client';
import { SavingsBadge } from '../SavingsBadge';
import { BookingOpportunityList } from '../BookingOpportunityList';

vi.mock('../../api/client', () => ({
  fetchBookingOpportunities: vi.fn(),
}));

describe('Frontend Booking Intelligence Component Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SavingsBadge with formatted amount', () => {
    render(<SavingsBadge amount={2600} />);
    expect(screen.getByText(/Save ₹2,600 INR/i)).toBeDefined();
  });

  it('renders booking recommendations list upon fetch', async () => {
    const mockRecs = [
      {
        category: 'hotel',
        title: '💰 Save ₹2,100 INR on Hotel',
        description: 'Switch to Hotel Aurora',
        savings_amount: 2100,
        severity: 'IMPORTANT',
        offer: {
          id: 'h_1',
          provider: 'Boutique Hotels Network',
          category: 'hotel',
          title: 'Hotel Aurora Heritage Goa',
          price: 5400,
          currency: 'INR',
          rating: 4.6,
          location: 'City Center, Goa',
          distance_from_itinerary_km: 1.1,
          cancellation_policy: 'Free Cancellation',
          booking_url: 'https://eeeztrip.com/hotels/goa/aurora',
        },
      },
    ];

    (client.fetchBookingOpportunities as any).mockResolvedValue(mockRecs);

    render(<BookingOpportunityList destination="Goa" />);

    await waitFor(() => {
      expect(screen.getByText('Booking Intelligence & Decision Support')).toBeDefined();
      expect(screen.getByText('Hotel Aurora Heritage Goa')).toBeDefined();
      expect(screen.getByText('View Option ➔')).toBeDefined();
    });
  });
});
