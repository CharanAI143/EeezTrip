import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewDestinations } from '../ReviewDestinations';
import * as firebase from '../../lib/firebase';
import type { User } from 'firebase/auth';

vi.mock('../../lib/firebase', () => ({
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

const mockGetDocs = vi.mocked(firebase.getDocs);
const mockLimit = vi.mocked(firebase.limit);
const mockAddDoc = vi.mocked(firebase.addDoc);
const mockQuery = vi.mocked(firebase.query);

const user = {
  uid: 'user-123',
  displayName: 'Ada',
  photoURL: 'https://example.com/a.png',
} as unknown as User;

function renderComponent(props: { user: User | null } = { user: null }) {
  return render(<ReviewDestinations user={props.user} onLogin={vi.fn()} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDocs.mockResolvedValue({ docs: [] } as never);
  mockAddDoc.mockResolvedValue({ id: 'r1' } as never);
});

describe('ReviewDestinations query', () => {
  it('bounds the collection read, as the Firestore rule requires', async () => {
    mockLimit.mockReturnValue(50 as never);
    renderComponent();

    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());
    // firestore.rules is `allow list: if request.query.limit <= 50`, so an
    // unbounded query would be denied in production.
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(mockQuery).toHaveBeenCalled();
  });
});

describe('ReviewDestinations form validation', () => {
  /**
   * Opens the review form.
   *
   * The control that opens it moves depending on whether the list has anything
   * in it: the toolbar button reads "Write a review" once there are reviews to
   * browse, and the empty state's reads "Write the first review". Both open the
   * same form, so match either rather than pinning the tests to one layout.
   */
  async function openReviewForm() {
    fireEvent.click(
      await screen.findByRole('button', { name: /write (a|the first) review/i })
    );
  }

  /**
   * Submits via the form element rather than clicking the button: the video
   * field is type="url", and jsdom's native constraint validation would reject
   * a javascript: URL before the submit handler ever runs. The point of these
   * tests is our own check, so bypass the browser's.
   */
  async function submitWithVideoUrl(videoUrl: string) {
    const { container } = renderComponent({ user });
    await openReviewForm();

    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: videoUrl },
    });
    fireEvent.change(screen.getByPlaceholderText(/describe your journey/i), {
      target: { value: 'Worth the trip.' },
    });
    fireEvent.change(screen.getByPlaceholderText(/kyoto, japan/i), {
      target: { value: 'Goa' },
    });

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
  }

  it.each([
    ['javascript:alert(1)'],
    ['data:text/html,<script>alert(1)</script>'],
    ['vbscript:msgbox(1)'],
    ['ftp://example.com/x'],
  ])('rejects %s without calling Firestore', async (badUrl) => {
    await submitWithVideoUrl(badUrl);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/must start with http/i)
    );
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('rejects a review over the 2000 character limit the rule enforces', async () => {
    const { container } = renderComponent({ user });
    await openReviewForm();

    fireEvent.change(screen.getByPlaceholderText(/describe your journey/i), {
      target: { value: 'a'.repeat(2001) },
    });
    fireEvent.change(screen.getByPlaceholderText(/kyoto, japan/i), {
      target: { value: 'Goa' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/2000 characters/i)
    );
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('accepts an https link', async () => {
    await submitWithVideoUrl('https://youtube.com/watch?v=abc');

    await waitFor(() => expect(mockAddDoc).toHaveBeenCalled());
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ videoUrl: 'https://youtube.com/watch?v=abc' })
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('writes both halves of the trip link together', async () => {
    // firestore.rules rejects a tripId without a tripTitle, so the two fields
    // have to travel as a pair or the write is denied as a permission error.
    //
    // getDocs serves two collections here, so each call gets its own answer: the
    // reviews read that runs first, then the signed-in traveller's saved trips.
    mockGetDocs
      .mockResolvedValueOnce({ docs: [] } as never)
      .mockResolvedValueOnce({
        docs: [
          { id: 'trip-abc', data: () => ({ title: 'Goa in December', destination: 'Goa', userId: 'user-123' }) },
        ],
      } as never);

    const { container } = renderComponent({ user });
    await openReviewForm();

    const linkSelect = await screen.findByRole('combobox', { name: /link to one of your trips/i });
    fireEvent.change(linkSelect, { target: { value: 'trip-abc' } });

    fireEvent.change(screen.getByPlaceholderText(/describe your journey/i), {
      target: { value: 'The beaches were empty and the food was extraordinary.' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(mockAddDoc).toHaveBeenCalled());
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tripId: 'trip-abc', tripTitle: 'Goa in December' })
    );
  });

  it('writes a null trip link when no trip is chosen', async () => {
    // The rules treat a missing field and a null one the same way, but the old
    // payload omitted the keys entirely. Being explicit keeps the stored shape
    // identical whether or not a trip was linked.
    mockGetDocs.mockResolvedValue({ docs: [] } as never);

    const { container } = renderComponent({ user });
    await openReviewForm();

    fireEvent.change(screen.getByPlaceholderText(/describe your journey/i), {
      target: { value: 'Worth it.' },
    });
    fireEvent.change(screen.getByPlaceholderText(/kyoto, japan/i), { target: { value: 'Goa' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(mockAddDoc).toHaveBeenCalled());
    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tripId: null, tripTitle: null })
    );
  });

  it('does not read a signed-out visitor’s trips', async () => {
    renderComponent();
    await waitFor(() => expect(mockGetDocs).toHaveBeenCalled());

    // Only the public reviews collection is read. A query against saved_trips
    // for a null user would be denied by firestore.rules.
    expect(vi.mocked(firebase.collection)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(firebase.collection)).toHaveBeenCalledWith({}, 'reviews');
  });

  it('reports the search term upward so the page can match it', async () => {
    const onSearch = vi.fn();
    render(
      <ReviewDestinations user={null} onLogin={vi.fn()} onSearch={onSearch} />
    );

    await waitFor(() => expect(onSearch).toHaveBeenCalledWith(''));
    fireEvent.change(screen.getByPlaceholderText(/search a destination/i), {
      target: { value: 'Kyoto' },
    });
    await waitFor(() => expect(onSearch).toHaveBeenCalledWith('Kyoto'));
  });

  it('surfaces a failed post instead of silently doing nothing', async () => {
    // The old catch let the rejection escape as an unhandled promise, so a failed
    // write looked exactly like a button that does nothing.
    mockGetDocs.mockResolvedValue({ docs: [] } as never);
    mockAddDoc.mockRejectedValue(new Error('permission-denied') as never);

    const { container } = renderComponent({ user });
    await openReviewForm();

    fireEvent.change(screen.getByPlaceholderText(/describe your journey/i), {
      target: { value: 'Worth it.' },
    });
    fireEvent.change(screen.getByPlaceholderText(/kyoto, japan/i), { target: { value: 'Goa' } });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not post your review/i)
    );
  });
});
