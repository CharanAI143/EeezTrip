import {
  createContext,
  Dispatch,
  ReactNode,
  useContext,
  useReducer,
} from 'react';
import { fetchImages, fetchRecommendation } from '../api/client';
import { Page, PlaceImage, Recommendation, TripPreferences } from '../types';

// ─── State Shape ─────────────────────────────────────────────────────────────

type State = {
  page: Page;
  preferences: TripPreferences;
  loading: boolean;
  error: string;
  recommendation: Recommendation | null;
  images: PlaceImage[];
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'NAVIGATE'; page: Page }
  | { type: 'SET_DESTINATION'; destination: string }
  | { type: 'SET_PREF'; field: keyof TripPreferences; value: string | number }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS'; recommendation: Recommendation; images: PlaceImage[] }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

// ─── Initial State ────────────────────────────────────────────────────────────

const initialPrefs: TripPreferences = {
  destination: '',
  mood: 'Relaxed',
  budget: 1500,
  days: 5,
};

const initialState: State = {
  page: 'landing',
  preferences: initialPrefs,
  loading: false,
  error: '',
  recommendation: null,
  images: [],
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
    case 'SUBMIT_ERROR':
      return { ...state, loading: false, error: action.error };
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
  submitTrip: () => Promise<void>;
};

const TripContext = createContext<ContextValue | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const navigate = (page: Page) => dispatch({ type: 'NAVIGATE', page });

  const submitTrip = async () => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      const [recommendation, images] = await Promise.all([
        fetchRecommendation(state.preferences),
        fetchImages(state.preferences.destination, 8),
      ]);
      dispatch({ type: 'SUBMIT_SUCCESS', recommendation, images });
      navigate('results');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      dispatch({ type: 'SUBMIT_ERROR', error: msg });
    }
  };

  return (
    <TripContext.Provider value={{ state, dispatch, navigate, submitTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripStore() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTripStore must be used inside TripProvider');
  return ctx;
}
