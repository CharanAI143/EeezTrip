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
   * Submits via the form element rather than clicking the button: the video
   * field is type="url", and jsdom's native constraint validation would reject
   * a javascript: URL before the submit handler ever runs. The point of these
   * tests is our own check, so bypass the browser's.
   */
  async function submitWithVideoUrl(videoUrl: string) {
    const { container } = renderComponent({ user });
    await screen.findByRole('button', { name: /share experience/i });
    fireEvent.click(screen.getByRole('button', { name: /share experience/i }));

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
    await screen.findByRole('button', { name: /share experience/i });
    fireEvent.click(screen.getByRole('button', { name: /share experience/i }));

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
});
