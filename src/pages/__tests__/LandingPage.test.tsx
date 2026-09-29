import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const navigate = vi.fn();
const dispatch = vi.fn();

vi.mock('../../state/tripStore', () => ({
  useTripStore: () => ({ navigate, dispatch }),
}));

import LandingPage from '../LandingPage';

describe('LandingPage interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes both hero CTAs to the choice page', () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /start planning free/i }));

    expect(navigate).toHaveBeenCalledWith('choice');
  });

  it('scrolls to the how-it-works section instead of the feature grid', () => {
    render(<LandingPage />);

    // The page already renders this section, so spy on it rather than adding a duplicate.
    const target = document.getElementById('how-it-works')!;
    const scrollSpy = vi.fn();
    target.scrollIntoView = scrollSpy;

    const features = document.getElementById('features-section')!;
    const featuresSpy = vi.fn();
    features.scrollIntoView = featuresSpy;

    fireEvent.click(screen.getByRole('button', { name: /see how it works/i }));

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
    expect(featuresSpy).not.toHaveBeenCalled();
  });

  it('flips a card on tap without navigating away', () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /show details for santorini/i }));

    expect(screen.getByText('Whitewashed cliff villages stacked above a drowned volcano caldera.')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('shows the region and what a flipped destination is famous for', () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /show details for kyoto/i }));

    // Every back face is in the DOM, so scope the assertions to the open one.
    const open = document.querySelector('.img-card-back[aria-hidden="false"]') as HTMLElement;
    expect(within(open).getByText('Kansai, Japan')).toBeInTheDocument();
    expect(within(open).getByText('Most famous for')).toBeInTheDocument();
    expect(within(open).getByText('Fushimi Inari gates')).toBeInTheDocument();
    expect(within(open).getByText('Arashiyama bamboo')).toBeInTheDocument();
    expect(within(open).getByText('Machiya wooden streets')).toBeInTheDocument();
  });

  it('gives every destination a region and three famous-for points', () => {
    render(<LandingPage />);

    expect(document.querySelectorAll('.img-card-back-region')).toHaveLength(6);
    expect(document.querySelectorAll('.img-card-back-label')).toHaveLength(6);
    for (const list of document.querySelectorAll('.img-card-highlights')) {
      expect(list.querySelectorAll('li')).toHaveLength(3);
    }
  });

  it('labels the famous-for list for screen readers', () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /show details for paris/i }));

    const list = screen.getByRole('list', { name: /most famous for/i });
    expect(list).toBeInTheDocument();
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('keeps the hidden back face out of the tab order', () => {
    render(<LandingPage />);

    const back = document.querySelector('.img-card-back') as HTMLElement;
    // aria-hidden alone does not remove focusable children from tab order.
    expect(back).toHaveAttribute('inert');

    fireEvent.click(screen.getByRole('button', { name: /show details for santorini/i }));

    const flippedBack = document.querySelector('.img-card-back') as HTMLElement;
    expect(flippedBack).not.toHaveAttribute('inert');
  });

  it('toggles a flipped card back to the front', () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /show details for bali/i }));
    fireEvent.click(screen.getByRole('button', { name: /hide details for bali/i }));

    expect(screen.getByRole('button', { name: /show details for bali/i })).toBeInTheDocument();
  });

  it('prefills the destination from the flipped card CTA', () => {
    render(<LandingPage />);

    fireEvent.click(screen.getByRole('button', { name: /show details for santorini/i }));
    fireEvent.click(screen.getByRole('button', { name: /plan this trip/i }));

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_DESTINATION', destination: 'Santorini' });
    expect(navigate).toHaveBeenCalledWith('preferences');
  });

  it('flips a card after the pointer rests on it for 3 seconds', () => {
    vi.useFakeTimers();
    try {
      render(<LandingPage />);

      const card = screen.getByRole('button', { name: /show details for kyoto/i }).closest('.img-card')!;

      fireEvent.mouseEnter(card);
      act(() => { vi.advanceTimersByTime(2900); });
      expect(screen.getByRole('button', { name: /show details for kyoto/i })).toBeInTheDocument();

      act(() => { vi.advanceTimersByTime(200); });
      expect(screen.getByRole('button', { name: /hide details for kyoto/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels the dwell flip when the pointer leaves early', () => {
    vi.useFakeTimers();
    try {
      render(<LandingPage />);

      const card = screen.getByRole('button', { name: /show details for paris/i }).closest('.img-card')!;

      fireEvent.mouseEnter(card);
      act(() => { vi.advanceTimersByTime(2000); });
      fireEvent.mouseLeave(card);
      act(() => { vi.advanceTimersByTime(5000); });

      expect(screen.getByRole('button', { name: /show details for paris/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not render the unverified usage and rating claims', () => {
    render(<LandingPage />);

    expect(screen.queryByText(/50K\+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/4\.9/)).not.toBeInTheDocument();
    expect(screen.getByText('Day Itineraries')).toBeInTheDocument();
  });

  it('does not repeat the how-it-works steps as features', () => {
    render(<LandingPage />);

    // Each of these restated a step title; the features section should only
    // cover what the product produces, not re-explain the flow.
    expect(screen.queryByText('Smart Budget Breakdown')).not.toBeInTheDocument();
    expect(screen.queryByText('Day-by-Day Itinerary')).not.toBeInTheDocument();
    expect(screen.queryByText('Tailored Travel Moods')).not.toBeInTheDocument();
  });

  it('keeps a space between the two words split by a line break in the h1', () => {
    render(<LandingPage />);

    // <br /> contributes no space to textContent, which used to yield
    // "perfectly plannedin seconds." for copy-paste and text extraction.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('planned in seconds');
  });
});
