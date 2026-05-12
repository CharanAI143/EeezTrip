import {
  createContext,
  Dispatch,
  ReactNode,
  useContext,
  useReducer,
  useEffect,
} from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { fetchImages, fetchRecommendation, reviseRecommendation } from '../api/client';
import { Page, PlaceImage, Recommendation, TripPreferences } from '../types';

// ─── State Shape ─────────────────────────────────────────────────────────────

type State = {
  page: Page;
  preferences: TripPreferences;
  loading: boolean;
  error: string;
  recommendation: Recommendation | null;
  images: PlaceImage[];
  revising: boolean;
  reviseError: string;
  user: User | null;
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'NAVIGATE'; page: Page }
  | { type: 'SET_DESTINATION'; destination: string }
  | { type: 'SET_PREF'; field: keyof TripPreferences; value: string | number }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; recommendation: Recommendation; images: PlaceImage[] }
  | { type: 'SET_IMAGES'; images: PlaceImage[] }
  | { type: 'SET_RECOMMENDATION'; recommendation: Recommendation }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'REVISE_START' }
  | { type: 'REVISE_SUCCESS'; recommendation: Recommendation }
  | { type: 'REVISE_ERROR'; error: string }
  | { type: 'SET_USER'; user: User | null }
  | { type: 'RESET' };

// ─── Initial State ────────────────────────────────────────────────────────────

const initialPrefs: TripPreferences = {
  planningType: 'detailed',
  origin: '',
  destination: '',
  mood: 'Relaxed',
  budget: 50000,
  days: 5,
  startDate: '',
  endDate: '',
  mode: 'normal',
};

const initialState: State = {
  page: 'landing',
  preferences: initialPrefs,
  loading: false,
  error: '',
  recommendation: null,
  images: [],
  revising: false,
  reviseError: '',
  user: null,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, page: action.page };
    case 'SET_DESTINATION':
      return {
        ...state,
        preferences: { ...state.preferences, destination: action.destination },
      };
    case 'SET_PREF':
      return {
        ...state,
        preferences: { ...state.preferences, [action.field]: action.value },
      };
    case 'SUBMIT_START':
      return { ...state, loading: true, error: '' };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        loading: false,
        recommendation: action.recommendation,
        images: action.images,
      };
    case 'SET_IMAGES':
      return {
        ...state,
        images: action.images,
      };
    case 'SET_RECOMMENDATION':
      return {
        ...state,
        recommendation: action.recommendation,
      };
    case 'SUBMIT_ERROR':
      return { ...state, loading: false, error: action.error };
    case 'REVISE_START':
      return { ...state, revising: true, reviseError: '' };
    case 'REVISE_SUCCESS':
      return { ...state, revising: false, recommendation: action.recommendation };
    case 'REVISE_ERROR':
      return { ...state, revising: false, reviseError: action.error };
    case 'SET_USER':
      return { ...state, user: action.user };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type ContextValue = {
  state: State;
  dispatch: Dispatch<Action>;
  navigate: (page: Page) => void;
  submitTrip: (overridePrefs?: Partial<TripPreferences>) => Promise<void>;
  reviseTrip: (instruction: string) => Promise<void>;
  setRecommendation: (recommendation: Recommendation) => void;
};

const TripContext = createContext<ContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch({ type: 'SET_USER', user });
    });
    return unsubscribe;
  }, []);

  const navigate = (page: Page) => dispatch({ type: 'NAVIGATE', page });
  const setRecommendation = (recommendation: Recommendation) =>
    dispatch({ type: 'SET_RECOMMENDATION', recommendation });

  const submitTrip = async (overridePrefs?: Partial<TripPreferences>) => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const finalPrefs = overridePrefs ? { ...state.preferences, ...overridePrefs } : state.preferences;
      const recommendation = await fetchRecommendation(finalPrefs);
      
      // Always sync the actual AI-chosen destination back into preferences
      // so it never goes stale when the user generates a second trip.
      if (recommendation.destination) {
        dispatch({
          type: 'SET_PREF',
          field: 'destination',
          value: recommendation.destination,
        });
      }

      dispatch({ type: 'SUBMIT_SUCCESS', recommendation, images: [] });
      navigate('results');

      // Load images in background so itinerary appears faster.
      fetchImages(recommendation.destination || state.preferences.destination, 8)
        .then((images) => dispatch({ type: 'SET_IMAGES', images }))
        .catch(() => {
          // Silently ignore image fetch issues; itinerary is already available.
        });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      dispatch({ type: 'SUBMIT_ERROR', error: msg });
    }
  };

  const reviseTrip = async (instruction: string) => {
    if (!state.recommendation) return;
    dispatch({ type: 'REVISE_START' });
    try {
      const newRec = await reviseRecommendation(state.preferences, state.recommendation, instruction);
      dispatch({ type: 'REVISE_SUCCESS', recommendation: newRec });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Revision failed';
      dispatch({ type: 'REVISE_ERROR', error: msg });
    }
  };

  return (
    <TripContext.Provider value={{ state, dispatch, navigate, submitTrip, reviseTrip, setRecommendation }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripStore() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTripStore must be used inside TripProvider');
  return ctx;
}
