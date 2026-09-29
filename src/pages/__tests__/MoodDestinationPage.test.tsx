import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripProvider } from '../../state/tripStore';
import MoodDestinationPage from '../MoodDestinationPage';
import * as gemini from '../../lib/gemini';

vi.mock('../../lib/gemini', async importOriginal => {
  const actual = await importOriginal<typeof import('../../lib/gemini')>();
  return { ...actual, getMoodRecommendations: vi.fn() };
});

const mockGetMood = vi.mocked(gemini.getMoodRecommendations);

function renderPage() {
  return render(
    <TripProvider>
      <MoodDestinationPage />
    </TripProvider>
  );
}

describe('MoodDestinationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks for a mood before showing any destination', () => {
    renderPage();
    expect(screen.getByText(/choose a mood above/i)).toBeInTheDocument();
    expect(mockGetMood).not.toHaveBeenCalled();
  });

  it('loads suggestions when a mood is picked', async () => {
    mockGetMood.mockResolvedValue([
      { name: 'Udaipur', description: 'd', whyMatch: 'Lakes and palaces', estimatedCost: 18000, landscapeType: 'culture', highlight: 'City of lakes' },
    ]);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /chill/i }));

    await waitFor(() => expect(screen.getByText('Udaipur')).toBeInTheDocument());
    expect(mockGetMood).toHaveBeenCalledWith('relaxed', expect.any(Number), 'INR');
  });

  it('shows a recoverable error when suggestions fail', async () => {
    mockGetMood.mockRejectedValue(new Error('boom'));

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /chill/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByText(/try another mood/i)).toBeInTheDocument();
  });

  it('renders the estimate with the currency', async () => {
    mockGetMood.mockResolvedValue([
      { name: 'Goa', description: 'd', whyMatch: 'Slow living', estimatedCost: 20000, landscapeType: 'beach', highlight: 'Slow living' },
    ]);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /chill/i }));

    await waitFor(() => expect(screen.getByText(/20,000/)).toBeInTheDocument());
    expect(screen.getByText(/INR/)).toBeInTheDocument();
  });
});
