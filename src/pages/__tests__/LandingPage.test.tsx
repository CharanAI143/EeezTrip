import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const navigate = vi.fn();
const dispatch = vi.fn();

vi.mock('../../state/tripStore', () => ({
  useTripStore: () => ({ navigate, dispatch }),
}));

// The provider reads the signed-in user's home region to theme the weather, so
// the profile fetch is stubbed per-test rather than hitting the network.
vi.mock('../../api/client', () => ({
  fetchUserProfile: vi.fn().mockResolvedValue(null),
}));

import LandingPage, { FLIP_DELAY_MS, HERO_SWAP_MS } from '../LandingPage';
import { fetchUserProfile } from '../../api/client';
import {
  climateOf,
  detectRegion,
  regionFromTimeZone,
  resolveSeason,
  resolveWeather,
  SEASON_WEATHER,
} from '../../components/landing/weather';
import { createInitialState } from '../../components/landing/LandingPageProvider';

/** Build a date in a given month (0-indexed) so the calendar is explicit. */
const monthDate = (month: number) => new Date(2026, month, 15);

/** Pin the timezone the provider will read, as the browser would report it. */
function stubTimeZone(tz: string) {
  vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
    resolvedOptions: () => ({ timeZone: tz }),
  } as unknown as Intl.DateTimeFormat);
}

/**
 * Render as a reader in India during the monsoon.
 *
 * The weather is now a function of region and calendar, so a test that only
 * renders the page would get whatever season the day it runs happens to be in.
 * Both halves are pinned here instead, which also keeps the assertion stable
 * across the year.
 */
function renderInMonsoon() {
  stubTimeZone('Asia/Kolkata');
  vi.setSystemTime(monthDate(6));
  render(<LandingPage />);
}

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

  it('flips a card after the pointer rests on it for the dwell delay', () => {
    vi.useFakeTimers();
    try {
      render(<LandingPage />);

      const card = screen.getByRole('button', { name: /show details for kyoto/i }).closest('.img-card')!;

      fireEvent.mouseEnter(card);
      act(() => { vi.advanceTimersByTime(FLIP_DELAY_MS - 100); });
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
      act(() => { vi.advanceTimersByTime(Math.floor(FLIP_DELAY_MS / 2)); });
      fireEvent.mouseLeave(card);
      act(() => { vi.advanceTimersByTime(5000); });

      expect(screen.getByRole('button', { name: /show details for paris/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('flips a dwell-opened card back when the pointer leaves', () => {
    vi.useFakeTimers();
    try {
      render(<LandingPage />);

      const card = screen.getByRole('button', { name: /show details for santorini/i }).closest('.img-card')!;

      fireEvent.mouseEnter(card);
      act(() => { vi.advanceTimersByTime(FLIP_DELAY_MS); });
      expect(screen.getByRole('button', { name: /hide details for santorini/i })).toBeInTheDocument();

      // Previously mouseleave only cleared the pending timer, so a card opened
      // by the dwell stayed on its back for good.
      fireEvent.mouseLeave(card);

      expect(screen.getByRole('button', { name: /show details for santorini/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('leaves a tapped card open when the pointer moves away', () => {
    vi.useFakeTimers();
    try {
      render(<LandingPage />);

      fireEvent.click(screen.getByRole('button', { name: /show details for bali/i }));

      const card = screen.getByRole('button', { name: /hide details for bali/i }).closest('.img-card')!;
      // Touch fires a synthetic mouselease immediately after the tap that opened
      // the card, so an unconditional unflip here would break tap-to-flip.
      fireEvent.mouseLeave(card);
      act(() => { vi.advanceTimersByTime(5000); });

      expect(screen.getByRole('button', { name: /hide details for bali/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not let a later hover close a card the user tapped', () => {
    vi.useFakeTimers();
    try {
      render(<LandingPage />);

      fireEvent.click(screen.getByRole('button', { name: /show details for kyoto/i }));

      const card = screen.getByRole('button', { name: /hide details for kyoto/i }).closest('.img-card')!;
      fireEvent.mouseEnter(card);
      act(() => { vi.advanceTimersByTime(5000); });
      fireEvent.mouseLeave(card);

      expect(screen.getByRole('button', { name: /hide details for kyoto/i })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps each hero card tilted at rest, with the drift on a parent', () => {
    render(<LandingPage />);

    const cards = Array.from(document.querySelectorAll('.hero-card'));
    expect(cards).toHaveLength(3);

    for (const [i, card] of cards.entries()) {
      // The tilt lives on a custom property on the card itself. Previously it
      // was a plain `transform: rotate()`, which the running float animation
      // silently overrode, flattening the whole composition.
      expect((card as HTMLElement).style.getPropertyValue('--hero-tilt')).toBe(
        ['3deg', '-5deg', '8deg'][i]
      );
    }

    // Drift is on a separate parent, so it composes with the tilt instead of
    // replacing it.
    for (const card of cards) {
      const slot = card.parentElement!;
      expect(slot.className).toContain('hero-card-slot');
      expect(slot.className).not.toContain('hero-card ');
    }
  });

  it('rotates the hero cards through different destinations over time', () => {
    vi.useFakeTimers();
    try {
      render(<LandingPage />);

      const alts = () => Array.from(document.querySelectorAll('.hero-card img')).map(i => i.getAttribute('alt'));
      const first = alts();
      expect(first).toHaveLength(3);
      // Distinct starts keep the three cards from ever duplicating a place.
      expect(new Set(first).size).toBe(3);

      act(() => { vi.advanceTimersByTime(HERO_SWAP_MS); });
      const second = alts();
      expect(second).not.toEqual(first);
      expect(new Set(second).size).toBe(3);

      act(() => { vi.advanceTimersByTime(HERO_SWAP_MS); });
      expect(alts()).not.toEqual(second);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cycles back to the starting destinations after a full lap', () => {
    vi.useFakeTimers();
    try {
      render(<LandingPage />);
      const alts = () => Array.from(document.querySelectorAll('.hero-card img')).map(i => i.getAttribute('alt'));
      const first = alts();

      act(() => { vi.advanceTimersByTime(HERO_SWAP_MS * 6); });
      expect(alts()).toEqual(first);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not change hero destinations when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    vi.useFakeTimers();
    try {
      render(<LandingPage />);
      const alts = () => Array.from(document.querySelectorAll('.hero-card img')).map(i => i.getAttribute('alt'));
      const first = alts();

      act(() => { vi.advanceTimersByTime(HERO_SWAP_MS * 3); });
      expect(alts()).toEqual(first);
    } finally {
      vi.useFakeTimers();
      vi.unstubAllGlobals();
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

describe('Seasonal weather layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The weather follows the real calendar now, so every test that renders the
    // page has to control the date itself.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(monthDate(6));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('maps each Indian season to its effect', () => {
    // The mapping is the whole point of the layer: the page used to run a
    // year-round blizzard regardless of the month.
    expect(resolveSeason(monthDate(0), 'southAsia')).toBe('winter'); // Jan
    expect(resolveSeason(monthDate(4), 'southAsia')).toBe('summer'); // May
    expect(resolveSeason(monthDate(6), 'southAsia')).toBe('monsoon'); // Jul
    expect(resolveSeason(monthDate(9), 'southAsia')).toBe('postMonsoon'); // Oct
    expect(resolveSeason(monthDate(11), 'southAsia')).toBe('winter'); // Dec

    expect(SEASON_WEATHER).toEqual({
      monsoon: 'rain',
      summer: 'sunny',
      postMonsoon: 'wind',
      winter: 'snow',
    });
  });

  it('flips the southern hemisphere by six months', () => {
    // January in Sydney is midsummer, so it maps to the month India is in July.
    expect(resolveSeason(monthDate(0), 'oceania', 'Australia/Sydney')).toBe('summer');
    expect(resolveSeason(monthDate(6), 'oceania', 'Australia/Sydney')).toBe('winter');
    // Same region, opposite hemisphere, opposite season.
    expect(resolveSeason(monthDate(0), 'oceania', 'Australia/Sydney')).not.toBe(
      resolveSeason(monthDate(0), 'europe')
    );
  });

  it('gives the tropics a wet year-round rather than a monsoon', () => {
    // Singapore has no dry season, so calling all twelve months "monsoon"
    // would be the same error the layer existed to fix.
    for (let m = 0; m < 12; m += 1) {
      expect(resolveSeason(monthDate(m), 'southeastAsia')).toBe('summer');
      expect(resolveWeather(monthDate(m), 'southeastAsia')).toBe('sunny');
    }
    expect(climateOf('southeastAsia')).toBe('tropical');
  });

  it('maps a timezone to the region whose calendar applies', () => {
    expect(regionFromTimeZone('Asia/Kolkata')).toBe('southAsia');
    expect(regionFromTimeZone('Asia/Kathmandu')).toBe('himalaya');
    expect(regionFromTimeZone('Europe/Berlin')).toBe('europe');
    expect(regionFromTimeZone('America/New_York')).toBe('northAmerica');
    expect(regionFromTimeZone('Australia/Sydney')).toBe('oceania');
    // An unknown zone is a deliberate null, so the caller can fall back
    // rather than silently showing the wrong hemisphere.
    expect(regionFromTimeZone('Mars/Olympus_Mons')).toBeNull();
    expect(regionFromTimeZone(undefined)).toBeNull();
  });

  it('themes the page for the region the browser reports', () => {
    stubTimeZone('Europe/Berlin');

    render(<LandingPage />);

    const page = document.querySelector('.lp-page') as HTMLElement;
    // Berlin is temperate, so the season follows the current calendar there
    // rather than the Indian monsoon the page used to be pinned to.
    expect(page.dataset.region).toBe('europe');
    expect(['winter', 'summer', 'postMonsoon']).toContain(page.dataset.season);
  });

  it('prefers the signed-in user region over the browser timezone', async () => {
    stubTimeZone('Europe/Berlin');
    (fetchUserProfile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      home_region: { value: 'southAsia' },
    });

    render(<LandingPage />);
    await act(async () => {
      await Promise.resolve();
    });

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.region).toBe('southAsia');
  });

  it('falls back to the timezone when the stored region is not recognised', async () => {
    stubTimeZone('Europe/Berlin');
    (fetchUserProfile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      home_region: { value: 'atlantis' },
    });

    render(<LandingPage />);
    await act(async () => {
      await Promise.resolve();
    });

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.region).toBe('europe');
  });

  it('keeps rendering when the profile request fails', async () => {
    stubTimeZone('Asia/Kolkata');
    (fetchUserProfile as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('offline')
    );

    render(<LandingPage />);
    await act(async () => {
      await Promise.resolve();
    });

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.region).toBe('southAsia');
    expect(page.dataset.weather).toBe('rain');
  });

  it('falls back to the product default when no timezone is available', () => {
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('Intl unavailable');
    });

    render(<LandingPage />);

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.region).toBe('southAsia');
  });

  it('detects the region from the current environment', () => {
    stubTimeZone('Asia/Kolkata');
    expect(detectRegion()).toBe('southAsia');
  });

  it('renders rain for an Indian reader in the monsoon', () => {
    renderInMonsoon();

    const layer = document.querySelector('.weather-layer') as HTMLElement;
    expect(layer.dataset.kind).toBe('rain');
    expect(layer.dataset.still).toBe('false');
    expect(document.querySelector('.weather-drop')).not.toBeNull();
    // No other effect should be in the tree at the same time.
    expect(document.querySelector('.weather-flake')).toBeNull();
    expect(document.querySelector('.weather-wind-streak')).toBeNull();
    expect(document.querySelector('.weather-mote')).toBeNull();
  });

  it('exposes the region, season and derived effect on the page root', () => {
    renderInMonsoon();

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.region).toBe('southAsia');
    expect(page.dataset.season).toBe('monsoon');
    expect(page.dataset.weather).toBe('rain');
  });

  it('shows a different effect to a reader outside the monsoon', () => {
    // October in India: the monsoon has withdrawn, so the page must not still
    // be selling the rainy hero to a reader standing in a dry week.
    stubTimeZone('Asia/Kolkata');
    vi.setSystemTime(monthDate(9));

    render(<LandingPage />);

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.season).toBe('postMonsoon');
    expect(page.dataset.weather).toBe('wind');
    expect(document.querySelector('.weather-wind-streak')).not.toBeNull();
    expect(document.querySelector('.weather-drop')).toBeNull();
  });

  it('builds the first frame from the real season, not a hardcoded default', () => {
    // The page used to paint a hardcoded monsoon first frame and then correct it
    // from a mount effect, so every launch visibly opened on falling rain and
    // swapped to the reader's real effect a frame later. The first frame is
    // resolved up front instead, which these assertions pin.
    stubTimeZone('Asia/Kolkata');
    vi.setSystemTime(monthDate(9));

    const launch = createInitialState();
    expect(launch.season).toBe('postMonsoon');
    expect(launch.weather).toBe('wind');

    // And it is still the calendar doing the work, not a different hardcode.
    vi.setSystemTime(monthDate(6));
    expect(createInitialState().weather).toBe('rain');

    // A reader with no readable timezone falls back to the India-first default
    // region rather than to a hardcoded season.
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
      throw new Error('Intl unavailable');
    });
    vi.setSystemTime(monthDate(9));
    const fallback = createInitialState();
    expect(fallback.region).toBe('southAsia');
    expect(fallback.season).toBe('postMonsoon');
  });

  it('renders wind as streaks and dust rather than solid shapes', () => {
    // The first wind build used 14 hard-edged glowing rings, each translated
    // rightward and looping back to its origin, which read on screen as a row
    // of orbs marching in one direction. The field has to be edge-faded strands
    // plus slower dust instead.
    stubTimeZone('Asia/Kolkata');
    vi.setSystemTime(monthDate(9));

    const { container } = render(<LandingPage />);

    const streaks = container.querySelectorAll('.weather-wind-streak');
    const dust = container.querySelectorAll('.weather-wind-dust');
    // Enough strands in frame that the field reads as air, not a procession.
    expect(streaks.length).toBeGreaterThan(10);
    // A second, slower component; without it every element moves at one speed.
    expect(dust.length).toBeGreaterThan(0);

    // No circular, bordered element remains: nothing to read as an orb.
    expect(container.querySelectorAll('.weather-wind-dust')[0].className).not.toMatch(/swirl/);
    for (const streak of streaks) {
      const el = streak as HTMLElement;
      // Streaks are wide and flat, which is what makes them read as travel.
      expect(el.style.width).not.toBe('');
      expect(parseFloat(el.style.height)).toBeLessThanOrEqual(2);
    }
  });

  it('makes the wind field clearly visible without a hard or aliased edge', () => {
    stubTimeZone('Asia/Kolkata');
    vi.setSystemTime(monthDate(9));

    const { container } = render(<LandingPage />);

    // Visible: every strand and mote sits well above the near-invisible range
    // the first build used, and the field is dense enough to read at a glance.
    for (const el of container.querySelectorAll<HTMLElement>('.weather-wind-streak')) {
      expect(parseFloat(el.style.opacity)).toBeGreaterThanOrEqual(0.3);
      // Softened: a 1-2px line at this opacity aliases into a hard jagged mark
      // without a sub-pixel blur, which is the strain the reader would feel.
      expect(el.style.filter).toContain('blur');
    }
    for (const el of container.querySelectorAll<HTMLElement>('.weather-wind-dust')) {
      expect(parseFloat(el.style.opacity)).toBeGreaterThanOrEqual(0.24);
      expect(el.style.filter).toContain('blur');
    }
  });

  it('stills every particle when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    try {
      renderInMonsoon();

      const layer = document.querySelector('.weather-layer') as HTMLElement;
      expect(layer.dataset.still).toBe('true');
      // The veil remains, so the season still reads as a colour cast.
      expect(document.querySelector('.weather-veil--rain')).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('resolves every month of every region to one of the four effects', () => {
    for (const region of ['southAsia', 'himalaya', 'southeastAsia', 'europe', 'oceania'] as const) {
      for (let m = 0; m < 12; m += 1) {
        const kind = resolveWeather(monthDate(m), region);
        expect(['rain', 'sunny', 'wind', 'snow']).toContain(kind);
      }
    }
  });
});

describe('Day and night themes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    stubTimeZone('Asia/Kolkata');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows the day theme during daylight hours', () => {
    // 14:00 local.
    vi.setSystemTime(new Date(2026, 6, 15, 14, 0, 0));

    render(<LandingPage />);

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.tod).toBe('day');
    expect(document.querySelector('.weather-layer')!.getAttribute('data-tod')).toBe('day');
  });

  it('shows the night theme after dark', () => {
    vi.setSystemTime(new Date(2026, 6, 15, 23, 0, 0));

    render(<LandingPage />);

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.tod).toBe('night');
  });

  it('keeps the season effect when only the time of day changes', () => {
    // Day/night is a colour axis, not an effect axis: the monsoon must stay the
    // monsoon at 2am, otherwise the toggle would be picking a season too.
    vi.setSystemTime(new Date(2026, 6, 15, 23, 0, 0));

    render(<LandingPage />);

    const layer = document.querySelector('.weather-layer') as HTMLElement;
    expect(layer.dataset.kind).toBe('rain');
    expect(layer.dataset.tod).toBe('night');
  });

  it('switches theme from the control and does not let the clock undo it', () => {
    vi.setSystemTime(new Date(2026, 6, 15, 14, 0, 0));

    render(<LandingPage />);

    const night = screen.getByRole('button', { name: /night/i });
    expect(night.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(night);

    const page = document.querySelector('.lp-page') as HTMLElement;
    expect(page.dataset.tod).toBe('night');
    expect(night.getAttribute('aria-pressed')).toBe('true');

    // Advance past the minute tick; the pinned choice must survive it.
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(document.querySelector('.lp-page')!.getAttribute('data-tod')).toBe('night');
  });

  it('offers a way back to the clock once pinned', () => {
    vi.setSystemTime(new Date(2026, 6, 15, 14, 0, 0));

    render(<LandingPage />);
    fireEvent.click(screen.getByRole('button', { name: /night/i }));

    // "Auto" only appears once the reader has overridden the clock, so an
    // un-overridden page has no dead control on it.
    fireEvent.click(screen.getByRole('button', { name: /auto/i }));

    expect(document.querySelector('.lp-page')!.getAttribute('data-tod')).toBe('day');
  });
});
