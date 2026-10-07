import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TripProvider, useTripStore } from '../../state/tripStore';
import ReviewsPage from '../ReviewsPage';
import * as firebase from '../../lib/firebase';
import { fetchExternalReviewsBundle } from '../../api/client';

// tripStore imports the auth subscription from 'firebase/auth' itself, so the
// sign-in has to be fired from there rather than from the lib/firebase wrapper.
vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return {
    ...actual,
    onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
      (globalThis as Record<string, unknown>).__fireAuthCallback = callback;
      return vi.fn();
    }),
  };
});

vi.mock('../../lib/firebase', () => ({
  // TripProvider only passes `auth` straight into onAuthStateChanged, which the
  // test fires by hand to sign a traveller in.
  auth: {},
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: unknown) => void) => {
    (globalThis as Record<string, unknown>).__fireAuthCallback = callback;
    return vi.fn();
  }),
  db: {},
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  getDocs: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'now'),
  handleFirestoreError: vi.fn(),
  OperationType: { LIST: 'list', CREATE: 'create' },
}));

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return { ...actual, fetchExternalReviewsBundle: vi.fn() };
});

const mockGetDocs = vi.mocked(firebase.getDocs);
const mockBundle = vi.mocked(fetchExternalReviewsBundle);

/** Reads the store out of the tree so navigation and the pending review can be asserted. */
function StoreProbe() {
  const { state } = useTripStore();
  return (
    <div data-testid="store">
      {JSON.stringify({ page: state.page, pending: state.pendingReviewDestination, signedIn: Boolean(state.user) })}
    </div>
  );
}

function renderPage() {
  return render(
    <TripProvider>
      <StoreProbe />
      <ReviewsPage />
    </TripProvider>
  );
}

function readStore() {
  return JSON.parse(screen.getByTestId('store').textContent || '{}');
}

function signIn() {
  const callback = (globalThis as Record<string, unknown>).__fireAuthCallback as (user: unknown) => void;
  act(() => callback({ uid: 'user-123', displayName: 'Ada' }));
}

const bundleWith = (overrides: Partial<Awaited<ReturnType<typeof fetchExternalReviewsBundle>>> = {}) => ({
  destination: 'Goa',
  reviews: [],
  sources: {},
  links: {},
  count: 0,
  failed: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDocs.mockResolvedValue({ docs: [] } as never);
  mockBundle.mockResolvedValue(bundleWith());
});

describe('ReviewsPage combined reviews', () => {
  it('shows traveller and travel-site reviews under their own headings', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'r1',
          data: () => ({
            userName: 'Ada',
            destination: 'Goa',
            rating: 5,
            review: 'Empty beaches and unbeatable food.',
          }),
        },
      ],
    } as never);
    const tripadvisorReview = {
      author: 'Priya',
      text: 'Beautiful beaches and old towns.',
      rating: 4.5,
      source: 'tripadvisor' as const,
      placeName: 'Goa',
    };
    const makemytripReview = {
      author: 'MakeMyTrip',
      text: 'Great stay, clean rooms.',
      rating: null,
      source: 'makemytrip' as const,
      placeName: 'Beach View Goa',
    };
    mockBundle.mockResolvedValue(
      bundleWith({
        count: 2,
        reviews: [tripadvisorReview, makemytripReview],
        sources: {
          tripadvisor: [tripadvisorReview],
          makemytrip: [makemytripReview],
        },
        links: {
          tripadvisor: 'https://www.tripadvisor.com/Tourism-g297604-Goa.html',
          makemytrip: 'https://www.makemytrip.com/tourism/goa-tourism.html',
        },
      })
    );

    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/search a destination/i), { target: { value: 'Goa' } });

    expect(await screen.findByText('What travellers say about Goa')).toBeInTheDocument();
    expect(await screen.findByText('From EeezTrip travellers')).toBeInTheDocument();
    // The same review also sits in the list above, so bodies are matched by
    // count rather than uniqueness; the headings are what prove the grouping.
    expect(screen.getAllByText('Empty beaches and unbeatable food.').length).toBeGreaterThan(0);
    expect(screen.getByText('From Tripadvisor')).toBeInTheDocument();
    expect(screen.getAllByText('Beautiful beaches and old towns.').length).toBeGreaterThan(0);
    expect(screen.getByText('From MakeMyTrip')).toBeInTheDocument();
    expect(screen.getAllByText('Great stay, clean rooms.').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /more on tripadvisor/i })).toBeInTheDocument();
  });

  it('offers a write link that carries the destination through sign-in when nothing has reviews', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/search a destination/i), { target: { value: 'Kyoto' } });

    expect(await screen.findByText('No reviews yet for Kyoto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /sign in to review/i }));

    await waitFor(() => {
      const store = readStore();
      expect(store.pending).toBe('Kyoto');
      expect(store.page).toBe('auth');
    });
  });

  it('asks to try again instead of inviting a first review when the sources errored', async () => {
    // An outage wearing the costume of an empty page: without this the
    // visitor is told "be the first" about a city with thousands of reviews.
    mockBundle.mockResolvedValue(
      bundleWith({
        failed: ['google', 'tripadvisor', 'makemytrip', 'booking'],
      })
    );

    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/search a destination/i), { target: { value: 'Varanasi' } });

    expect(await screen.findByText("Couldn't load reviews for Varanasi")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /review varanasi|sign in to review/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    await waitFor(() => expect(mockBundle).toHaveBeenCalledTimes(2));
  });

  it('opens a prefilled form for a signed-in traveller who chose to review later', async () => {
    renderPage();
    signIn();
    await waitFor(() => expect(readStore().signedIn).toBe(true));

    fireEvent.change(screen.getByPlaceholderText(/search a destination/i), { target: { value: 'Goa' } });
    expect(await screen.findByText('No reviews yet for Goa')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /review goa/i }));

    // The form belongs to ReviewDestinations above the fold, prefilled with the
    // destination the visitor asked about.
    expect(await screen.findByPlaceholderText(/kyoto, japan/i)).toHaveValue('Goa');
    await waitFor(() => expect(readStore().pending).toBeNull());
  });
});