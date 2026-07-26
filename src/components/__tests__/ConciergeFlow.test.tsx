import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { TripProvider } from '../../state/tripStore';
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
  sendConciergeChat: vi.fn(),
}));

describe('Frontend Concierge Flow Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles conversational concierge query and renders intent badge', async () => {
    const mockConciergeRes = {
      reply: 'The weather in Goa is clear and sunny with high of 29°C.',
      detected_intent: 'WEATHER_QUESTION',
      confidence: 0.98,
      action_taken: 'Queried Weather Provider',
    };

    (client.sendConciergeChat as any).mockResolvedValue(mockConciergeRes);

    render(
      <TripProvider>
        <AiConcierge />
      </TripProvider>
    );

    // Open Concierge
    const toggleBtn = screen.getByRole('button');
    fireEvent.click(toggleBtn);

    const input = screen.getByPlaceholderText("e.g., 'Make day 2 kid-friendly'");
    fireEvent.change(input, { target: { value: 'What is the weather like in Goa?' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(client.sendConciergeChat).toHaveBeenCalledWith('What is the weather like in Goa?', undefined);
      expect(screen.getByText('WEATHER QUESTION')).toBeDefined();
      expect(screen.getByText(/The weather in Goa is clear/i)).toBeDefined();
    });
  });
});
