import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  DESTINATIONS,
  FLIP_DELAY_MS,
  HERO_SWAP_MS,
  SECTION_IDS,
  type SectionId,
} from './landingContent';
import {
  DEFAULT_REGION,
  DEFAULT_SEASON,
  detectRegion,
  REGION_OPTIONS,
  resolveSeason,
  resolveTimeOfDay,
  SEASON_WEATHER,
  type Region,
  type Season,
  type TimeOfDay,
  type WeatherKind,
} from './weather';
import { fetchUserProfile } from '../../api/client';

/**
 * Page-level state for the landing page.
 *
 * Previously each section owned its own interaction state, so a control placed
 * in one part of the page could only reach that part: the hero ran its own
 * carousel timer, the destination grid its own flip timers, and nothing could
 * address "the whole page" at once. Everything that can be affected by a
 * page-wide interaction now lives in this one reducer, and every section reads
 * it through `useLandingPage()`.
 *
 * Adding a control to the page panel means adding a field here and a setter on
 * the context value — sections pick it up without being threaded props.
 */

export type FlipOwner = 'hover' | 'tap' | null;

export type LandingState = {
  /** Index into DESTINATIONS for each hero slot; drives the carousel. */
  heroStep: number;
  /** Whether the hero carousel is advancing. */
  heroPlaying: boolean;
  /** Milliseconds between hero swaps. */
  heroSwapMs: number;
  /** Milliseconds a pointer must rest on a destination card before it flips. */
  flipDelayMs: number;
  /** Destination currently showing its back face. */
  flipped: string | null;
  /**
   * Whether `flipped` was opened by a dwell or by a tap. Only a dwell flip is
   * undone when the pointer leaves — a tap is a deliberate pin, and touch fires
   * a synthetic mouseleave right after the tap that opened it.
   */
  flipOwner: FlipOwner;
  /** Section the reader is currently in. */
  activeSection: SectionId;
  /** 0 at the top of the page, 1 at the bottom. Drives scroll-linked effects. */
  scrollProgress: number;
  /** Set when the reader has asked for less motion than the page animates. */
  reducedMotion: boolean;
  /**
   * Which region the page weather is being themed for. Detected from the
   * browser timezone, and overridden by the signed-in user's stored home region
   * once the profile loads, because a traveller is often not in the region they
   * are from.
   */
  region: Region;
  /**
   * IANA timezone backing `region`. Kept separately because the hemisphere
   * depends on the timezone, and a coarse region like "oceania" spans the
   * equator.
   */
  timeZone: string | null;
  /**
   * Which of the two colour themes the page is using. Follows the reader's own
   * clock until they override it, and is independent of the season: a monsoon
   * night looks different from a monsoon afternoon without either of them
   * changing which effect is on screen.
   */
  timeOfDay: TimeOfDay;
  /** True once the reader has chosen a time of day, which stops the clock overriding them. */
  timeOfDayPinned: boolean;
  /** Which season the page weather is showing, for the current region. */
  season: Season;
  /** Effect the current season maps to. Derived, never set directly. */
  weather: WeatherKind;
};

/** The region and its derived season/weather before the browser reports a timezone. */
function initialWeatherState(): Pick<
  LandingState,
  'region' | 'timeZone' | 'timeOfDay' | 'timeOfDayPinned' | 'season' | 'weather'
> {
  return {
    region: DEFAULT_REGION,
    timeZone: null,
    // Day, not the clock: the first frame is the lighter theme, which is the
    // safer default to paint briefly than a dark page.
    timeOfDay: 'day',
    timeOfDayPinned: false,
    season: DEFAULT_SEASON,
    weather: SEASON_WEATHER[DEFAULT_SEASON],
  };
}

/** The browser's IANA timezone, or null where Intl is unavailable. */
function browserTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Validate a region id that arrived from outside the bundle.
 *
 * The value comes from the profile API, so it is not guaranteed to be one of
 * our ids — a renamed or hand-edited row would otherwise resolve to
 * `undefined` and fall through to a blank season with no error.
 */
function parseRegion(value: unknown): Region | null {
  const known = new Set<string>(REGION_OPTIONS.map((o) => o.id));
  return typeof value === 'string' && known.has(value) ? (value as Region) : null;
}

const initialState: LandingState = {
  heroStep: 0,
  heroPlaying: true,
  heroSwapMs: HERO_SWAP_MS,
  flipDelayMs: FLIP_DELAY_MS,
  flipped: null,
  flipOwner: null,
  activeSection: SECTION_IDS.hero,
  scrollProgress: 0,
  reducedMotion: false,
  ...initialWeatherState(),
};

type Action =
  | { type: 'HERO_ADVANCE' }
  | { type: 'HERO_SET_STEP'; step: number }
  | { type: 'HERO_SET_PLAYING'; playing: boolean }
  | { type: 'HERO_SET_SWAP_MS'; ms: number }
  | { type: 'SET_FLIP_DELAY_MS'; ms: number }
  | { type: 'FLIP'; name: string; owner: Exclude<FlipOwner, null> }
  | { type: 'UNFLIP'; name: string; onlyIfHovered: boolean }
  | { type: 'CLOSE_CARD' }
  | { type: 'SET_ACTIVE_SECTION'; section: SectionId }
  | { type: 'SET_SCROLL_PROGRESS'; progress: number }
  | { type: 'SET_REDUCED_MOTION'; reduced: boolean }
  | { type: 'SET_REGION'; region: Region; timeZone: string | null }
  | { type: 'SET_TIME_OF_DAY'; timeOfDay: TimeOfDay }
  | { type: 'SET_TIME_OF_DAY_FROM_CLOCK'; timeOfDay: TimeOfDay }
  | { type: 'FOLLOW_CLOCK'; timeOfDay: TimeOfDay }
  | { type: 'SET_SEASON'; season: Season };

function reducer(state: LandingState, action: Action): LandingState {
  switch (action.type) {
    case 'HERO_ADVANCE':
      return { ...state, heroStep: state.heroStep + 1 };
    case 'HERO_SET_STEP':
      return { ...state, heroStep: action.step };
    case 'HERO_SET_PLAYING':
      return { ...state, heroPlaying: action.playing };
    case 'HERO_SET_SWAP_MS':
      // Guard against a zero/negative interval, which would pin the CPU.
      return { ...state, heroSwapMs: Math.max(0, action.ms) };
    case 'SET_FLIP_DELAY_MS':
      return { ...state, flipDelayMs: Math.max(0, action.ms) };
    case 'FLIP':
      return { ...state, flipped: action.name, flipOwner: action.owner };
    case 'UNFLIP':
      // `onlyIfHovered` is what keeps a tap from being closed by the mouseleave
      // that touch synthesises right after the tap.
      if (action.onlyIfHovered && state.flipOwner !== 'hover') return state;
      return state.flipped === action.name
        ? { ...state, flipped: null, flipOwner: null }
        : state;
    case 'CLOSE_CARD':
      return state.flipped === null ? state : { ...state, flipped: null, flipOwner: null };
    case 'SET_ACTIVE_SECTION':
      return state.activeSection === action.section
        ? state
        : { ...state, activeSection: action.section };
    case 'SET_SCROLL_PROGRESS':
      return { ...state, scrollProgress: action.progress };
    case 'SET_REDUCED_MOTION':
      return { ...state, reducedMotion: action.reduced };
    case 'SET_REGION': {
      // The whole point of region: the season is a function of where the reader
      // is, so both are recomputed together. Any manually chosen season is
      // dropped, because keeping it would freeze the page into a season that
      // contradicts the region it is supposedly themed for.
      const season = resolveSeason(new Date(), action.region, action.timeZone);
      return {
        ...state,
        region: action.region,
        timeZone: action.timeZone,
        season,
        weather: SEASON_WEATHER[season],
      };
    }
    case 'SET_TIME_OF_DAY':
      // Any explicit pick pins the choice. Without this the clock would undo
      // the reader's selection on the next tick, which is the behaviour that
      // makes a day/night toggle feel broken.
      return { ...state, timeOfDay: action.timeOfDay, timeOfDayPinned: true };
    case 'FOLLOW_CLOCK':
      // The explicit "follow the clock" action. Sets the value and unpins it
      // in one dispatch, so the theme changes now and keeps tracking later.
      if (!state.timeOfDayPinned && state.timeOfDay === action.timeOfDay) return state;
      return { ...state, timeOfDay: action.timeOfDay, timeOfDayPinned: false };
    case 'SET_TIME_OF_DAY_FROM_CLOCK':
      // Guarded on both sides: the reducer refuses to move off a pinned choice,
      // and returns the same object when nothing changed so the minute tick
      // that fires 1440 times a day does not re-render the page.
      if (state.timeOfDayPinned || state.timeOfDay === action.timeOfDay) return state;
      return { ...state, timeOfDay: action.timeOfDay };
    case 'SET_SEASON':
      // Weather is derived from the season, never set on its own, so the two
      // can never drift out of sync.
      return { ...state, season: action.season, weather: SEASON_WEATHER[action.season] };
    default:
      return state;
  }
}

export type LandingActions = {
  /** Open a card on tap, or close it if it is already the open one. */
  toggleCard: (name: string) => void;
  /** Open a card the dwell timer reached. */
  openCardByHover: (name: string) => void;
  /** Called when the pointer enters a card; starts the dwell timer. */
  beginDwell: (name: string) => void;
  /** Called when the pointer leaves a card; cancels any pending flip. */
  endDwell: (name: string) => void;
  /** Close whatever card is open. */
  closeCard: () => void;
  /** Step the hero carousel forward. */
  advanceHero: () => void;
  /** Jump the hero carousel to a specific destination index. */
  setHeroStep: (step: number) => void;
  setHeroPlaying: (playing: boolean) => void;
  setHeroSwapMs: (ms: number) => void;
  setFlipDelayMs: (ms: number) => void;
  setActiveSection: (section: SectionId) => void;
  setReducedMotion: (reduced: boolean) => void;
  /**
   * Theme the weather for a region. Recomputes the season for the new region,
   * so this also resets a manually chosen season.
   */
  setRegion: (region: Region) => void;
  /**
   * Switch between the day and night themes. Pins the choice, so the clock
   * stops overriding it.
   */
  setTimeOfDay: (timeOfDay: TimeOfDay) => void;
  /** Hand control back to the reader's local clock. */
  followClock: () => void;
  /** Switch the page weather to another season. */
  setSeason: (season: Season) => void;
  /** Smooth-scroll to any section on the page. */
  scrollToSection: (id: string) => void;
};

type LandingContextValue = {
  state: LandingState;
  actions: LandingActions;
  /** Destinations the page is currently showing, in display order. */
  destinations: typeof DESTINATIONS;
};

const LandingContext = createContext<LandingContextValue | null>(null);

export function LandingPageProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Dwell timer lives here, next to the flip state it mutates, so a card's
  // timer is owned by the page rather than by whichever card started it.
  const dwellTimer = useRef<number | null>(null);

  // Mirror of the reducer state for effects that must read it without
  // re-subscribing. The clock tick checks the pin flag through this.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Region supplied by the signed-in user, e.g. "southAsia". `null` means the
  // reader has not told us where they are from, so the timezone stands in.
  const [profileRegion, setProfileRegion] = useState<Region | null>(null);

  const clearDwell = useCallback(() => {
    if (dwellTimer.current !== null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }, []);

  useEffect(() => clearDwell, [clearDwell]);

  /**
   * Theme the weather for wherever the reader actually is, on mount.
   *
   * This runs after first paint rather than during the initial render because
   * the timezone has to be read off `Intl`, and doing that in a lazy initial
   * state would run it on every render. The default-region state stands for the
   * first frame, so there is no flash of a mismatched season, only one frame
   * of the default.
   */
  useEffect(() => {
    const timeZone = browserTimeZone();
    dispatch({ type: 'SET_REGION', region: profileRegion ?? detectRegion(), timeZone });
  }, [profileRegion]);

  // The signed-in user's stored home region wins over the browser timezone: a
  // traveller planning a trip from home is not in the region they are reading
  // about, and the product is India-first while most of its readers are not.
  useEffect(() => {
    let cancelled = false;

    fetchUserProfile()
      .then((profile) => {
        if (cancelled || !profile) return;
        const stored = parseRegion(profile.home_region?.value);
        if (stored) setProfileRegion(stored);
      })
      .catch(() => {
        // A failed profile fetch is not an error worth surfacing: the page
        // simply falls back to the browser timezone.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const actions = useMemo<LandingActions>(
    () => ({
      toggleCard: name => {
        clearDwell();
        if (state.flipped === name) {
          dispatch({ type: 'CLOSE_CARD' });
        } else {
          // A tap pins the card open, so it is no longer hover-owned.
          dispatch({ type: 'FLIP', name, owner: 'tap' });
        }
      },
      openCardByHover: name => {
        dispatch({ type: 'FLIP', name, owner: 'hover' });
      },
      beginDwell: name => {
        clearDwell();
        dwellTimer.current = window.setTimeout(() => {
          dwellTimer.current = null;
          dispatch({ type: 'FLIP', name, owner: 'hover' });
        }, state.flipDelayMs);
      },
      endDwell: name => {
        clearDwell();
        dispatch({ type: 'UNFLIP', name, onlyIfHovered: true });
      },
      closeCard: () => {
        clearDwell();
        dispatch({ type: 'CLOSE_CARD' });
      },
      advanceHero: () => dispatch({ type: 'HERO_ADVANCE' }),
      setHeroStep: step => dispatch({ type: 'HERO_SET_STEP', step }),
      setHeroPlaying: playing => dispatch({ type: 'HERO_SET_PLAYING', playing }),
      setHeroSwapMs: ms => dispatch({ type: 'HERO_SET_SWAP_MS', ms }),
      setFlipDelayMs: ms => dispatch({ type: 'SET_FLIP_DELAY_MS', ms }),
      setActiveSection: section => dispatch({ type: 'SET_ACTIVE_SECTION', section }),
      setReducedMotion: reduced => dispatch({ type: 'SET_REDUCED_MOTION', reduced }),
      setRegion: region =>
        dispatch({ type: 'SET_REGION', region, timeZone: browserTimeZone() }),
      setTimeOfDay: timeOfDay => dispatch({ type: 'SET_TIME_OF_DAY', timeOfDay }),
      followClock: () =>
        dispatch({ type: 'FOLLOW_CLOCK', timeOfDay: resolveTimeOfDay(new Date()) }),
      setSeason: season => dispatch({ type: 'SET_SEASON', season }),
      scrollToSection: id => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      },
    }),
    [clearDwell, state.flipped, state.flipDelayMs]
  );

  // Respect the OS setting once on mount. The global CSS guard collapses the
  // animations themselves; this stops the JS-driven ones (carousel, dwell)
  // from continuing to change content under a static layout.
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      dispatch({ type: 'SET_REDUCED_MOTION', reduced: true });
    }
  }, []);

  /**
   * Follow the reader's clock, so someone opening the page at 2am gets the
   * night theme without touching anything.
   *
   * Checked every minute rather than only on mount: a tab left open across
   * dusk would otherwise keep the morning palette. The tick is skipped once
   * the reader has picked a theme, so a pinned choice is never undone. It
   * reads the flag through a ref rather than closing over `state`, because
   * depending on it would tear down and rebuild the timer on every change.
   */
  useEffect(() => {
    const sync = () => {
      if (stateRef.current.timeOfDayPinned) return;
      dispatch({ type: 'SET_TIME_OF_DAY_FROM_CLOCK', timeOfDay: resolveTimeOfDay(new Date()) });
    };

    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // Page-level scroll tracking. One listener for the whole page rather than one
  // per section, so every section can react to the same scroll position.
  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      dispatch({ type: 'SET_SCROLL_PROGRESS', progress: Math.min(1, Math.max(0, progress)) });

      // Section detection uses the same rAF-batched pass, so a fast scroll
      // cannot settle on a stale section.
      const mid = window.innerHeight / 2;
      for (const [id, section] of Object.entries(SECTION_IDS) as [string, SectionId][]) {
        const el = document.getElementById(id);
        if (!el) continue;
        const box = el.getBoundingClientRect();
        if (box.top <= mid && box.bottom > mid) {
          dispatch({ type: 'SET_ACTIVE_SECTION', section });
          break;
        }
      }
    };

    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const value = useMemo<LandingContextValue>(
    () => ({ state, actions, destinations: DESTINATIONS }),
    [state]
  );

  return <LandingContext.Provider value={value}>{children}</LandingContext.Provider>;
}

export function useLandingPage(): LandingContextValue {
  const ctx = useContext(LandingContext);
  if (!ctx) throw new Error('useLandingPage must be used inside LandingPageProvider');
  return ctx;
}
