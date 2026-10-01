import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  BedDouble, Bot, CloudSun, Lightbulb, MapPin, MessageSquare, Mic,
  Minimize2, Send, Sparkles, Square, Sun, Sunset, Sunrise, Trash2,
  UtensilsCrossed, Wallet, X,
} from 'lucide-react';
import { voiceAssistant } from '../../lib/voice';
import { fetchChatReply, reviseRecommendation, transcribeAudio } from '../../api/client';
import { useTripStore } from '../../state/tripStore';
import { CostBreakdown, Recommendation } from '../../types';
import { ChatLog } from './ChatThread';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'travel_planner_chat_history';
const PENDING_REPLY = 'Thinking...';
const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hi! I am your travel assistant. Ask me anything about your trip — I will mirror your live itinerary in the panel on the right while we plan.'
};

function normalizeRole(role: unknown): 'user' | 'assistant' {
  if (role === 'user') return 'user';
  return 'assistant';
}

/**
 * Builds the trip context the backend uses to ground its answers.
 *
 * Deliberately a single plain sentence. An earlier version injected a bulleted,
 * pipe-separated report ("- Origin: ...", "Day 1: ... | Morning: ...") and the
 * model copied that layout verbatim — the chat answers came back as markdown
 * tables and checklists, the exact "long report" style this bot must not use.
 * Style is demonstrated by the system prompt, not by the context payload, so
 * the context is kept as flat reference data with no formatting to imitate.
 */
function buildTripContextMessage(recommendation: Recommendation | null, preferences: Record<string, unknown>): string {
  const facts = [
    `origin ${String(preferences.origin || 'not set')}`,
    `destination ${String(preferences.destination || 'not set')}`,
    `${String(preferences.days)} days`,
    `budget ${Number(preferences.budget).toLocaleString('en-IN')} rupees`,
    `travel mode ${String(preferences.mode)}`,
  ];

  if (preferences.mood) facts.push(`mood ${String(preferences.mood)}`);

  if (!recommendation) {
    return `Internal reference only, never restate or format this: no itinerary drafted yet; ${facts.join(', ')}.`;
  }

  const costs = recommendation.estimated_cost_breakdown;
  const total = costs.accommodation + costs.food + costs.transport + costs.activities + costs.misc;

  return `Internal reference only, never restate or format this: ${facts.join(', ')}; the user currently has a plan called "${recommendation.title}" costing ${total.toLocaleString('en-IN')} rupees in total.`;
}

const PLAN_EDIT_LEADERS = new Set([
  'change', 'modify', 'update', 'revise', 'edit', 'rework', 'replace', 'switch',
  'adjust', 'make', 'cut', 'reduce', 'increase', 'add', 'remove', 'drop', 'swap',
  'extend', 'shorten', 'skip', 'avoid', 'reroute', 'redo',
]);

const PLAN_ANCHORS = [
  'budget', 'cost', 'price', 'day', 'days', 'day 1', 'day 2', 'day 3',
  'itinerary', 'plan', 'trip', 'route', 'destination', 'hotel', 'stay',
  'stay', 'transport', 'food', 'activit', 'schedule', 'mood',
];

const PLAN_ADJECTIVES = [
  'cheaper', 'cheap', 'more', 'less', 'expensive', 'longer', 'shorter',
  'faster', 'slower', 'earlier', 'later', 'local', 'touristy', 'offbeat',
];

/**
 * A plan revision is only assumed when the message opens with an explicit
 * change verb AND then names a plan element. This prevents false positives
 * like "what's the budget?" or "add some tips" from silently rewriting the
 * itinerary or from skipping a normal conversational answer.
 */
function isPlanEditIntent(text: string): boolean {
  let t = text.trim().toLowerCase().replace(/[.,!?]+$/, '');

  // Strip polite fronting ("can you", "please", "i want to", "let's"...).
  t = t.replace(
    /^(can you|could you|could we|can we|please|i want to|i would like to|i'd like to|let's|lets|we should|we can)\s+/,
    '',
  );

  const firstWord = t.split(/\s+/)[0] || '';
  if (!PLAN_EDIT_LEADERS.has(firstWord)) return false;

  const mentionsPlan = PLAN_ANCHORS.some((anchor) => t.includes(anchor));
  if (mentionsPlan) return true;

  // Short terse imperatives ("make it cheaper", "make this local") are
  // unambiguous tries to alter the current plan even without an anchor.
  return PLAN_ADJECTIVES.some((adj) => t.includes(adj)) && t.length < 60;
}

function costTotal(costs: CostBreakdown): number {
  return costs.accommodation + costs.food + costs.transport + costs.activities + costs.misc;
}

function CostBar({ costs }: { costs: CostBreakdown }) {
  const parts = [
    { label: 'Stay', value: costs.accommodation, className: 'bg-sky-500' },
    { label: 'Food', value: costs.food, className: 'bg-sky-300' },
    { label: 'Moving', value: costs.transport, className: 'bg-pink-400' },
    { label: 'Activities', value: costs.activities, className: 'bg-pink-500' },
    { label: 'Extras', value: costs.misc, className: 'bg-slate-300' },
  ];
  const total = Math.max(costTotal(costs), 1);

  return (
    <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_8px_20px_-12px_rgba(2,132,199,0.35)]">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
        <Wallet className="h-3.5 w-3.5 text-pink-500" /> Estimated cost
      </p>
      <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-sky-50">
        {parts.map((part) => (
          <div key={part.label} className={part.className} style={{ width: `${(part.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {parts.map((part) => (
          <li key={part.label} className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className={`h-2 w-2 shrink-0 rounded-full ${part.className}`} />
              <span className="truncate">{part.label}</span>
            </span>
            <span className="shrink-0 font-semibold text-slate-700">₹{part.value.toLocaleString('en-IN')}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2 border-t border-sky-100 pt-1.5 text-[11px] font-bold text-slate-700">
          <span>Total</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </li>
      </ul>
    </section>
  );
}

function ItineraryPane() {
  const { state } = useTripStore();
  const rec = state.recommendation;
  const prefs = state.preferences;

  if (!rec) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-100 to-pink-100 text-sky-600 shadow-inner">
          <MapPin className="h-7 w-7" />
        </div>
        <p className="text-sm font-bold text-slate-700">No itinerary yet</p>
        <p className="text-xs leading-relaxed text-slate-400">
          Generate a plan on the Results page and I will mirror it here — live, as we revise it together.
        </p>
      </div>
    );
  }

  const cost = rec.estimated_cost_breakdown;

  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_8px_20px_-12px_rgba(2,132,199,0.4)]">
        <div className="bg-gradient-to-br from-sky-700 via-sky-500 to-pink-500 p-4 text-white">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">Your plan</p>
          <h4 className="truncate text-lg font-bold leading-snug">{rec.title}</h4>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-sky-100">{rec.tagline}</p>
          {rec.best_time && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white">
              <Sparkles className="h-3 w-3" /> {rec.best_time}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 divide-x divide-sky-100 border-t border-sky-100 text-center">
          <div className="px-2 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Budget</p>
            <p className="truncate text-xs font-bold text-sky-700">{rec.destination || prefs.destination ? '₹' + Math.round(costTotal(cost)).toLocaleString('en-IN') : '—'}</p>
          </div>
          <div className="px-2 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Days</p>
            <p className="text-xs font-bold text-sky-700">{prefs.days}</p>
          </div>
          <div className="px-2 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Mood</p>
            <p className="truncate text-xs font-bold text-sky-700">{prefs.mood}</p>
          </div>
        </div>
        {rec.summary && (
          <p className="border-t border-sky-100 px-4 py-3 text-[11px] leading-relaxed text-slate-500">{rec.summary}</p>
        )}
      </section>

      <CostBar costs={cost} />

      {rec.daily_plan.length > 0 && (
        <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_8px_20px_-12px_rgba(2,132,199,0.35)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Day plan</p>
          <ol className="mt-2.5">
            {rec.daily_plan.map((day, index) => (
              <li key={day.day} className="relative flex gap-3 pb-4 last:pb-0">
                {index < rec.daily_plan.length - 1 && (
                  <span aria-hidden className="absolute left-[11px] top-7 bottom-0 w-px bg-sky-100" />
                )}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sky-100 text-[10px] font-bold text-sky-700">
                  D{day.day}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-slate-700">{day.title}</p>
                  <ul className="mt-1 space-y-1 text-[11px] leading-snug text-slate-500">
                    <li className="flex items-start gap-1.5"><Sunrise className="mt-0.5 h-3 w-3 shrink-0 text-sky-400" /><span className="min-w-0">{day.morning}</span></li>
                    <li className="flex items-start gap-1.5"><Sun className="mt-0.5 h-3 w-3 shrink-0 text-sky-400" /><span className="min-w-0">{day.midday}</span></li>
                    <li className="flex items-start gap-1.5"><CloudSun className="mt-0.5 h-3 w-3 shrink-0 text-pink-400" /><span className="min-w-0">{day.afternoon}</span></li>
                    <li className="flex items-start gap-1.5"><Sunset className="mt-0.5 h-3 w-3 shrink-0 text-pink-400" /><span className="min-w-0">{day.evening}</span></li>
                  </ul>
                  {day.tip && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[10px] italic text-sky-600">
                      <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-sky-500" /><span className="min-w-0">{day.tip}</span>
                    </p>
                  )}
                  {day.stay && (
                    <p className="mt-1 flex items-start gap-1.5 text-[10px] text-slate-400">
                      <BedDouble className="mt-0.5 h-3 w-3 shrink-0" /><span className="min-w-0">{day.stay}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {rec.highlights.length > 0 && (
        <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_8px_20px_-12px_rgba(2,132,199,0.35)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">Highlights</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rec.highlights.slice(0, 6).map((h) => (
              <span key={h} className="rounded-full border border-sky-100 bg-sky-50 px-2.5 py-1 text-[10px] font-semibold text-sky-700">{h}</span>
            ))}
          </div>
        </section>
      )}

      {rec.must_try_food.length > 0 && (
        <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_8px_20px_-12px_rgba(2,132,199,0.35)]">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
            <UtensilsCrossed className="h-3.5 w-3.5 text-pink-500" /> Must-try
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rec.must_try_food.slice(0, 6).map((f) => (
              <span key={f} className="rounded-full border border-pink-200 bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-600">{f}</span>
            ))}
          </div>
        </section>
      )}

      {rec.cozy_tips.length > 0 && (
        <section className="rounded-2xl border border-sky-100 bg-white p-4 shadow-[0_8px_20px_-12px_rgba(2,132,199,0.35)]">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
            <Lightbulb className="h-3.5 w-3.5 text-pink-500" /> Insider tips
          </p>
          <ul className="mt-2 space-y-1.5">
            {rec.cozy_tips.slice(0, 3).map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-[11px] leading-snug text-slate-500">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-pink-400" />
                <span className="min-w-0">{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export const ChatBot: React.FC = () => {
  const { state, setRecommendation } = useTripStore();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [INITIAL_MESSAGE];
    try {
      const parsed = JSON.parse(saved) as Array<{ role?: unknown; content?: unknown }>;
      const normalized = parsed
        .filter((m) => typeof m?.content === 'string' && m.content.trim().length > 0)
        .map((m) => ({ role: normalizeRole(m.role), content: String(m.content) }));
      return normalized.length ? normalized : [INITIAL_MESSAGE];
    } catch {
      return [INITIAL_MESSAGE];
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const reduceMotion = useReducedMotion();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const autoStopTimerRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView?.({ behavior });
  }, []);

  const MAX_PERSISTED_MESSAGES = 40;
  const MAX_PAYLOAD_MESSAGES = 30;

  useEffect(() => {
    scrollToBottom();
    const trimmed = messages.slice(-MAX_PERSISTED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }, [messages, scrollToBottom]);

  const sendMessageText = async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned || isLoading) return;

    const userMessage: Message = { role: 'user', content: cleaned };
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', content: PENDING_REPLY }]);
    setInput('');
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      if (state.recommendation && isPlanEditIntent(cleaned)) {
        const revised = await reviseRecommendation(
          state.preferences,
          state.recommendation,
          cleaned,
          abortControllerRef.current.signal,
        );
        setRecommendation(revised);
        const revisionSummary = `Done. I updated your itinerary — check the side panel. Updated title: ${revised.title}`;
        setMessages((prev) => {
          const next = [...prev];
          const pendingIndex = next.map((m) => m.content).lastIndexOf(PENDING_REPLY);
          if (pendingIndex >= 0) {
            next[pendingIndex] = { role: 'assistant', content: revisionSummary };
            return next;
          }
          return [...prev, { role: 'assistant', content: revisionSummary }];
        });
        return;
      }

      const chatMessages = [...messages.slice(-MAX_PAYLOAD_MESSAGES), userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const contextMessage = buildTripContextMessage(state.recommendation, state.preferences);
      const payloadMessages = [
        { role: 'system' as const, content: contextMessage },
        ...chatMessages,
      ];

      const fullResponse = await fetchChatReply(payloadMessages, abortControllerRef.current.signal);
      setMessages((prev) => {
        const next = [...prev];
        const pendingIndex = next.map((m) => m.content).lastIndexOf(PENDING_REPLY);
        if (pendingIndex >= 0) {
          next[pendingIndex] = { role: 'assistant', content: fullResponse || 'I am here. Could you try rephrasing that once?' };
          return next;
        }
        return [...prev, { role: 'assistant', content: fullResponse || 'I am here. Could you try rephrasing that once?' }];
      });
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Chat error:', error);
      setMessages((prev) => {
        const next = [...prev];
        const pendingIndex = next.map((m) => m.content).lastIndexOf(PENDING_REPLY);
        if (pendingIndex >= 0) {
          next[pendingIndex] = { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' };
          return next;
        }
        return [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }];
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSend = async () => {
    await sendMessageText(input);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    stopAudioCapture();
    setIsRecording(false);
  };

  const stopAudioCapture = () => {
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) {
        window.clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Audio recording is not supported in this browser.' }]);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const selectedType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = selectedType
        ? new MediaRecorder(stream, { mimeType: selectedType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        audioChunksRef.current = [];
        stopAudioCapture();

        if (!audioBlob.size) {
          setIsRecording(false);
          return;
        }

        setIsLoading(true);
        abortControllerRef.current = new AbortController();

        try {
          const transcript = await transcribeAudio(audioBlob, abortControllerRef.current.signal);
          if (!transcript.trim()) {
            throw new Error('No transcription text');
          }
          setInput(transcript);
          await sendMessageText(transcript);
        } catch (error: any) {
          if (error.name === 'AbortError') return;
          console.error('Transcription error:', error);
          // transcribeAudio() already turns provider failures into an
          // actionable sentence, so only the "heard nothing" case keeps the
          // apologetic wording. Anything else is a service/transport problem and
          // repeating "I could not understand that audio" just misdirects.
          const reason = typeof error?.message === 'string' ? error.message.trim() : '';
          if (!reason || reason === 'No transcription text') {
            setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not understand that audio. Please try again.' }]);
          } else {
            setMessages((prev) => [...prev, { role: 'assistant', content: reason }]);
          }
        } finally {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(300);
      setIsRecording(true);
      autoStopTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 8000);
    } catch (error) {
      console.error('Recording error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Microphone access was denied or unavailable.' }]);
      stopAudioCapture();
      setIsRecording(false);
    }
  };

  const handleAudioButtonClick = () => {
    if (isLoading && !isRecording) return;
    if (isRecording && mediaRecorderRef.current) {
      if (autoStopTimerRef.current) {
        window.clearTimeout(autoStopTimerRef.current);
        autoStopTimerRef.current = null;
      }
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }
    handleStartRecording();
  };

  /**
   * Read a single assistant bubble aloud. Reads only that bubble's own text, so
   * the user never hears the whole transcript. Clicking the bubble that is
   * already speaking (or any other bubble) stops playback first.
   */
  const toggleReadAloud = (index: number, content: string) => {
    if (speakingIndex === index) {
      voiceAssistant.stopSpeaking();
      setSpeakingIndex(null);
      return;
    }
    voiceAssistant.stopSpeaking();
    setSpeakingIndex(index);
    voiceAssistant.speak(content, () => setSpeakingIndex(null));
  };

  // Stop any speech when the widget closes or unmounts.
  useEffect(() => () => voiceAssistant.stopSpeaking(), []);

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your chat history?')) {
      setMessages([INITIAL_MESSAGE]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={reduceMotion ? { duration: 0.18 } : { type: 'spring', stiffness: 320, damping: 30 }}
            className="relative mb-4 flex h-[min(34rem,calc(100vh-6rem))] w-[min(46rem,calc(100vw-2.5rem))] max-w-full flex-col rounded-3xl bg-white shadow-[0_24px_70px_-24px_rgba(2,132,199,0.55)] ring-1 ring-white/70"
          >
            <header className="shrink-0 rounded-t-3xl bg-gradient-to-br from-sky-700 via-sky-500 to-pink-500 text-white">
              <div className="flex items-center justify-between gap-3 px-7 py-5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/15">
                    <Bot className="h-6 w-6 text-brand-amber" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold leading-tight tracking-tight">Travel Expert AI</h3>
                    <p className="mt-1 flex items-center gap-1.5">
                      <span aria-hidden className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75 motion-reduce:animate-none" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/85">Active</span>
</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={clearHistory}
                        title="Clear history"
                        aria-label="Clear chat history"
                        className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        title="Minimise"
                        aria-label="Minimise chat"
                        className="grid h-9 w-9 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                      >
                        <Minimize2 className="h-4 w-4" />
                      </button>
                </div>
              </div>
              <div aria-hidden className="mx-7 h-px bg-gradient-to-r from-white/50 via-white/15 to-white/50" />
            </header>

            <div className="flex min-h-0 flex-1">
              <section className="flex w-[min(26rem,58%)] min-w-0 flex-col overflow-visible rounded-bl-3xl bg-gradient-to-b from-white via-sky-50/80 to-pink-50/50">

                <ChatLog
                  messages={messages}
                  isLoading={isLoading}
                  endRef={messagesEndRef}
                  speakingIndex={speakingIndex}
                  onReadAloud={toggleReadAloud}
                />

                {isLoading && (
                  <div className="flex shrink-0 justify-center bg-white/80 px-5 py-2 backdrop-blur">
                    <button
                      onClick={handleStop}
                      aria-label="Stop generating"
                      className="flex items-center gap-2 rounded-full border border-sky-200/70 bg-white px-4 py-1.5 text-[10px] font-bold uppercase text-sky-700 shadow-sm transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                    >
                      <Square className="h-3 w-3 fill-current" />
                      Stop
                    </button>
                  </div>
                )}

                <div className="shrink-0 px-5 pt-3 pb-6">
                  <div className="chat-composer flex items-center gap-2 rounded-2xl border-4 border-sky-400/60 bg-white shadow-[inset_0_1px_2px_rgba(2,132,199,0.08)] outline-none transition-all hover:border-sky-400 focus-within:border-sky-500">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      aria-label="Message the travel assistant"
                      placeholder="Ask a question..."
                      disabled={isLoading}
                      className="flex-1 min-w-0 h-[52px] bg-transparent pl-5 pr-2 text-sm text-slate-700 caret-sky-600 placeholder:text-slate-400 outline-none"
                    />
                    <button
                      id="chat-send-btn"
                      onClick={() => (isRecording || !input.trim() ? handleAudioButtonClick() : void handleSend())}
                      disabled={isLoading && !isRecording}
                      title={isRecording ? 'Stop recording and send' : input.trim() ? 'Send' : 'Record audio'}
                      aria-label={isRecording ? 'Stop recording and send' : input.trim() ? 'Send message' : 'Record a voice message'}
                      className={`mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${isRecording ? 'scale-105 animate-pulse bg-pink-500 text-white shadow-[0_8px_20px_-8px_rgba(236,72,153,0.7)]' : input.trim() ? 'bg-gradient-to-br from-sky-500 to-pink-500 text-white shadow-md hover:scale-105 active:scale-95' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
                    >
                      {isRecording || !input.trim() ? (
                        <Mic className={`h-5 w-5 ${isRecording ? 'animate-bounce' : ''}`} />
                      ) : (
                        <Send className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>
              </section>

              <aside aria-label="Live itinerary" className="hidden min-w-0 flex-1 flex-col rounded-br-3xl bg-gradient-to-b from-white to-pink-50/70 md:flex">
                <div className="flex shrink-0 items-center justify-between border-b border-sky-100/80 bg-white/70 px-5 py-3 backdrop-blur">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
                    <MapPin className="h-3.5 w-3.5 text-pink-500" /> Live itinerary
                  </div>
                  {state.recommendation && (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                      <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none" />
                      Synced
                    </span>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 scrollbar-hide">
                  <ItineraryPane />
                </div>
              </aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close trip assistant' : 'Open trip assistant'}
        aria-expanded={isOpen}
        className="group w-16 h-16 bg-gradient-to-r from-sky-600 to-pink-500 rounded-full shadow-2xl flex items-center justify-center text-white border-2 border-white/40 hover:brightness-105 transition-all relative overflow-hidden"
        animate={{ borderRadius: isOpen ? '1rem' : 'full' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-8 h-8 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative"
            >
              <MessageSquare className="w-8 h-8 text-white group-hover:text-sky-100 transition-colors" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-pink-200 rounded-full animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
          <div className="absolute top-0 right-0 p-1.5">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </motion.button>
    </div>
  );
};