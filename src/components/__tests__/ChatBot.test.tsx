import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ChatBot } from '../chatbot/ChatBot';
import { fetchChatReply, reviseRecommendation } from '../../api/client';
import { voiceAssistant } from '../../lib/voice';
import { Recommendation } from '../../types';

vi.mock('../../lib/voice', () => ({
  voiceAssistant: {
    isSupported: vi.fn(() => true),
    isSpeechSynthesisSupported: vi.fn(() => true),
    startListening: vi.fn(),
    stopListening: vi.fn(),
    // Deliberately does NOT fire onEnd, so the "speaking" state persists in
    // tests. Tests that need completion invoke the captured callback.
    speak: vi.fn(),
    stopSpeaking: vi.fn(),
  },
}));

vi.mock('../../api/client', () => ({
  fetchChatReply: vi.fn(),
  reviveRecommendation: vi.fn(),
  reviseRecommendation: vi.fn(),
  transcribeAudio: vi.fn(),
}));

const sampleRecommendation: Recommendation = {
  destination: 'Goa',
  title: 'Sunset Beaches of Goa',
  tagline: 'A laid-back 3-day escape along the golden coast.',
  summary: 'Slow mornings, quiet coves, and fresh seafood.',
  best_time: 'Nov - Feb',
  highlights: ['Calangute', 'Chapora Fort', 'Market walk'],
  daily_plan: [
    {
      day: 1,
      title: 'Arrive & unwind',
      morning: 'Reach the villa by noon',
      midday: 'Lunch at a beach shack',
      afternoon: 'Walk the quiet north beaches',
      evening: 'Sunset at Chapora Fort',
      tip: 'Start early to beat the traffic',
      stay: 'Beach villa near Calangute',
    },
    {
      day: 2,
      title: 'Old Goa & markets',
      morning: 'Explore the basilicas',
      midday: 'Local fish thali',
      afternoon: 'Saturday night market',
      evening: 'Live music at a beach café',
      tip: 'The market gets busy after 6pm',
    },
  ],
  cozy_tips: ['Carry cash for beach shacks', 'Book scooters a day ahead'],
  must_try_food: ['Goan fish curry', 'Bebinca'],
  estimated_cost_breakdown: {
    accommodation: 9000,
    food: 4500,
    transport: 3000,
    activities: 2500,
    misc: 1000,
  },
};

const revisedRecommendation: Recommendation = {
  ...sampleRecommendation,
  title: 'Budget Beaches of Goa',
  tagline: 'A cheaper, hostel-friendly 3 days.',
  estimated_cost_breakdown: {
    accommodation: 4000,
    food: 3500,
    transport: 2000,
    activities: 1500,
    misc: 500,
  },
};

type StoreState = {
  page: string;
  preferences: {
    planningType: string;
    origin: string;
    destination: string;
    mood: string;
    budget: number;
    days: number;
    startDate: string;
    endDate: string;
    mode: string;
  };
  loading: boolean;
  error: string;
  recommendation: Recommendation | null;
  images: unknown[];
  revising: boolean;
  reviseError: string;
  user: unknown;
  sessionId: string | null;
  revisionHistory: unknown[];
};

type StoreShape = {
  state: StoreState;
  navigate: ReturnType<typeof vi.fn>;
  setRecommendation: ReturnType<typeof vi.fn>;
  resetTrip: ReturnType<typeof vi.fn>;
  reviseTrip: ReturnType<typeof vi.fn>;
  submitTrip: ReturnType<typeof vi.fn>;
};

const baseState: StoreState = {
  page: 'landing',
  preferences: {
    planningType: 'detailed',
    origin: 'Bangalore',
    destination: 'Goa',
    mood: 'Relaxed',
    budget: 50000,
    days: 3,
    startDate: '',
    endDate: '',
    mode: 'normal',
  },
  loading: false,
  error: '',
  recommendation: null,
  images: [],
  revising: false,
  reviseError: '',
  user: null,
  sessionId: null,
  revisionHistory: [],
};

let mockStore: StoreShape;

function makeStore(overrides: { state?: Partial<StoreState> } = {}): StoreShape {
  return {
    state: { ...baseState, ...overrides.state },
    navigate: vi.fn(),
    setRecommendation: vi.fn((rec: Recommendation) => {
      mockStore = { ...mockStore, state: { ...mockStore.state, recommendation: rec } };
    }),
    resetTrip: vi.fn(),
    reviseTrip: vi.fn(),
    submitTrip: vi.fn(),
  };
}

vi.mock('../../state/tripStore', () => ({
  useTripStore: () => mockStore,
}));

const mockedFetchChatReply = vi.mocked(fetchChatReply);
const mockedReviseRecommendation = vi.mocked(reviseRecommendation);

beforeEach(() => {
  localStorage.clear();
  mockStore = makeStore();
  mockedFetchChatReply.mockReset();
  mockedFetchChatReply.mockResolvedValue('Mock assistant reply');
  mockedReviseRecommendation.mockReset();
  vi.mocked(voiceAssistant.speak).mockClear();
  vi.mocked(voiceAssistant.stopSpeaking).mockClear();
});

describe('ChatBot Assistant Workbook', () => {
  it('opens the two-pane workbook with title, status and controls', () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    expect(screen.getByRole('heading', { name: 'Travel Expert AI' })).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Minimise chat' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear chat history' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Live itinerary' })).toBeInTheDocument();
  });

  it('shows an empty state in the workbook until a plan exists', () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    const pane = screen.getByRole('complementary', { name: 'Live itinerary' });
    expect(within(pane).getByText('No itinerary yet')).toBeInTheDocument();
  });

  it('mirrors the live itinerary, including costs and the day plan', () => {
    mockStore = makeStore({ state: { recommendation: sampleRecommendation } });
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    const pane = screen.getByRole('complementary', { name: 'Live itinerary' });
    expect(within(pane).getByText('Sunset Beaches of Goa')).toBeInTheDocument();
    expect(within(pane).getByText('Goan fish curry')).toBeInTheDocument();
    expect(within(pane).getByText('Arrive & unwind')).toBeInTheDocument();
    expect(within(pane).getByText('Stay')).toBeInTheDocument();
    expect(within(pane).getByText('₹9,000')).toBeInTheDocument();
    expect(within(pane).getAllByText('₹20,000').length).toBeGreaterThanOrEqual(1);
  });

  it('repaints the workbook live after the user revises the plan in chat', async () => {
    mockStore = makeStore({ state: { recommendation: sampleRecommendation } });
    mockedReviseRecommendation.mockResolvedValue(revisedRecommendation);
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    fireEvent.change(screen.getByLabelText('Message the travel assistant'), {
      target: { value: 'make the budget cheaper' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Budget Beaches of Goa')).toBeInTheDocument();
    expect(mockStore.setRecommendation).toHaveBeenCalledWith(revisedRecommendation);
    const pane = screen.getByRole('complementary', { name: 'Live itinerary' });
    expect(within(pane).getAllByText('₹11,500').length).toBeGreaterThanOrEqual(1);
  });

  it('never lets a message bubble clip or overflow its container', async () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    const log = screen.getByRole('log');
    const longText = `almost-${'x'.repeat(700)}`;

    fireEvent.change(screen.getByLabelText('Message the travel assistant'), { target: { value: longText } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => {
      const bubbles = within(log).getAllByRole('paragraph');
      const userBubble = bubbles.find((b) => b.textContent?.startsWith('almost-'));

      expect(userBubble).toBeDefined();
      const userText = userBubble as HTMLElement;
      expect(userText.classList.contains('bubble__text')).toBe(true);
      expect(userText.style.overflowWrap).toBe('anywhere');
      expect(userText.style.wordBreak).toBe('break-word');
      expect(userText.style.whiteSpace).toBe('pre-wrap');

      const bubbleShell = userText.parentElement as HTMLElement;
      expect(bubbleShell.classList.contains('bubble')).toBe(true);
      expect(bubbleShell.classList.contains('bubble--user')).toBe(true);
      expect(bubbleShell.className).not.toMatch(/overflow-hidden/);
    });
  });

  it('pins the chat log as the only scroll region, with chrome pinned around it', () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    const log = screen.getByRole('log');
    expect(log.classList.contains('chat-log')).toBe(true);

    const header = screen.getByRole('heading', { name: 'Travel Expert AI' }).closest('header') as HTMLElement;
    expect(header.classList.contains('shrink-0')).toBe(true);

    const pane = screen.getByRole('complementary', { name: 'Live itinerary' });
    expect(pane.querySelector<HTMLElement>('.overflow-y-auto')).not.toBeNull();
  });

  it('lets the user send a question and renders the assistant reply', async () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    fireEvent.change(screen.getByLabelText('Message the travel assistant'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Hello')).toBeInTheDocument();
    expect(await screen.findByText('Mock assistant reply')).toBeInTheDocument();
  });

  it('does not submit an empty message', () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    const input = screen.getByLabelText('Message the travel assistant');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockedFetchChatReply).not.toHaveBeenCalled();
  });

  it('morphs the composer action between mic and send like WhatsApp', () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    expect(screen.getByRole('button', { name: 'Record a voice message' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Message the travel assistant'), { target: { value: 'Hello' } });

    expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Record a voice message' })).toBeNull();
  });

  it('lets assistant messages be read aloud via per-message button', async () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    fireEvent.change(screen.getByLabelText('Message the travel assistant'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    const reply = await screen.findByText('Mock assistant reply');
    const readBtn = within(reply.closest('.bubble-group') as HTMLElement).getByRole('button', {
      name: 'Read this message aloud',
    });

    fireEvent.click(readBtn);
    expect(voiceAssistant.speak).toHaveBeenCalledWith('Mock assistant reply', expect.any(Function));
    expect(
      within(reply.closest('.bubble-group') as HTMLElement).getByRole('button', {
        name: 'Stop reading aloud',
      }),
    ).toBeInTheDocument();
  });

  it('reads only the clicked bubble, never the whole transcript', () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    // The seed assistant message and any user message must not leak in.
    fireEvent.change(screen.getByLabelText('Message the travel assistant'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    return screen.findByText('Mock assistant reply').then(() => {
      const bubbles = screen.getAllByRole('log')[0].querySelectorAll('.bubble-group');
      expect(bubbles.length).toBeGreaterThanOrEqual(3);

      // Click the *first* bubble's reader, then assert only that text is spoken.
      const firstGroup = bubbles[0] as HTMLElement;
      fireEvent.click(within(firstGroup).getByRole('button', { name: 'Read this message aloud' }));

      expect(voiceAssistant.speak).toHaveBeenCalledTimes(1);
      const spoken = vi.mocked(voiceAssistant.speak).mock.calls[0][0];

      // The seed bubble's own text, verbatim and nothing else.
      const seed = screen.getByRole('log').querySelector('.bubble__text') as HTMLElement;
      expect(spoken).toBe(seed.textContent);
      expect(spoken).not.toContain('Mock assistant reply');
      expect(spoken).not.toContain('Hello');
    });
  });

  it('stops playback when the same bubble is clicked again', async () => {
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    fireEvent.change(screen.getByLabelText('Message the travel assistant'), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    const reply = await screen.findByText('Mock assistant reply');
    const group = reply.closest('.bubble-group') as HTMLElement;

    fireEvent.click(within(group).getByRole('button', { name: 'Read this message aloud' }));
    fireEvent.click(within(group).getByRole('button', { name: 'Stop reading aloud' }));

    expect(voiceAssistant.stopSpeaking).toHaveBeenCalled();
    expect(within(group).getByRole('button', { name: 'Read this message aloud' })).toBeInTheDocument();
  });

  it('does not silently rewrite the itinerary for questions that merely mention a plan word', async () => {
    mockStore = makeStore({ state: { recommendation: sampleRecommendation } });
    mockedReviseRecommendation.mockResolvedValue(revisedRecommendation);
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    fireEvent.change(screen.getByLabelText('Message the travel assistant'), { target: { value: "what's the budget?" } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Mock assistant reply')).toBeInTheDocument();
    expect(mockedReviseRecommendation).not.toHaveBeenCalled();
    expect(mockStore.setRecommendation).not.toHaveBeenCalled();
  });

  it('requires an explicit change verb before a plan element to trigger a revision', async () => {
    mockStore = makeStore({ state: { recommendation: sampleRecommendation } });
    mockedReviseRecommendation.mockResolvedValue(revisedRecommendation);
    render(<ChatBot />);
    fireEvent.click(screen.getByRole('button', { name: 'Open trip assistant' }));

    fireEvent.change(screen.getByLabelText('Message the travel assistant'), { target: { value: 'can you add a day to the itinerary' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText(/updated your itinerary/i)).toBeInTheDocument();
    expect(mockedReviseRecommendation).toHaveBeenCalled();
  });
});