import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import {
  DESTINATIONS,
  FLIP_DELAY_MS,
  HERO_SWAP_MS,
  SECTION_IDS,
  type SectionId,
} from './landingContent';

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
};

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
  | { type: 'SET_REDUCED_MOTION'; reduced: boolean };

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

  const clearDwell = useCallback(() => {
    if (dwellTimer.current !== null) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }, []);

  useEffect(() => clearDwell, [clearDwell]);

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
