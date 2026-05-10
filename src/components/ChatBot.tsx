import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Minimize2, Trash2, Square, Mic, Volume2, VolumeX } from 'lucide-react';
import { voiceAssistant } from '../lib/voice';
import { fetchChatReply, reviseRecommendation, transcribeAudio } from '../api/client';
import { useTripStore } from '../state/tripStore';
import { Recommendation, TripPreferences } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'travel_planner_chat_history';
const PENDING_REPLY = 'Thinking...';
const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: 'Hi there! I am your travel assistant. Ask me anything about your trip, destinations, or travel tips!'
};

function normalizeRole(role: unknown): 'user' | 'assistant' {
  if (role === 'user') return 'user';
  return 'assistant';
}

function buildTripContextMessage(
  recommendation: Recommendation | null,
  preferences: TripPreferences,
): string {
  if (!recommendation) {
    return `User has not generated an itinerary yet. Current draft preferences:
- Origin: ${preferences.origin || 'Not set'}
- Destination: ${preferences.destination || 'Not set'}
- Mood: ${preferences.mood}
- Budget: ₹${preferences.budget.toLocaleString('en-IN')}
- Days: ${preferences.days}
- Mode: ${preferences.mode}
If user asks for a plan change, suggest clear next edits.`;
  }

  const highlights = recommendation.highlights.slice(0, 3).join('; ');
  const foods = recommendation.must_try_food.slice(0, 3).join('; ');
  const tips = recommendation.cozy_tips.slice(0, 2).join('; ');
  const firstDays = recommendation.daily_plan
    .slice(0, 3)
    .map((d) => `Day ${d.day}: ${d.title} | Morning: ${d.morning} | Afternoon: ${d.afternoon} | Evening: ${d.evening}`)
    .join('\n');
  const costs = recommendation.estimated_cost_breakdown;
  const total =
    costs.accommodation + costs.food + costs.transport + costs.activities + costs.misc;

  return `Use this as the user's current itinerary context. When answering, refer to these details naturally.
Preferences:
- Origin: ${preferences.origin || 'Not set'}
- Destination: ${preferences.destination || 'Not set'}
- Mood: ${preferences.mood}
- Budget: ₹${preferences.budget.toLocaleString('en-IN')}
- Days: ${preferences.days}
- Mode: ${preferences.mode}

Itinerary:
- Title: ${recommendation.title}
- Tagline: ${recommendation.tagline}
- Summary: ${recommendation.summary}
- Best time: ${recommendation.best_time}
- Highlights: ${highlights}
- Must try food: ${foods}
- Insider tips: ${tips}
- Cost total: ₹${total.toLocaleString('en-IN')}
- Cost split: stay ₹${costs.accommodation.toLocaleString('en-IN')}, food ₹${costs.food.toLocaleString('en-IN')}, transport ₹${costs.transport.toLocaleString('en-IN')}, activities ₹${costs.activities.toLocaleString('en-IN')}, misc ₹${costs.misc.toLocaleString('en-IN')}
- Day plan excerpt:
${firstDays}`;
}

function isPlanEditIntent(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = [
    'change', 'modify', 'update', 'revise', 'edit', 'replace', 'switch',
    'add', 'remove', 'rework', 'adjust', 'budget', 'day 1', 'day 2', 'day 3',
    'make it', 'make this', 'can you change', 'can you update',
  ];
  return keywords.some((k) => t.includes(k));
}

export const ChatBot: React.FC = () => {
  const { state, setRecommendation } = useTripStore();
  const quickPrompts = [
    'Plan a 3-day Goa trip under 25000 INR',
    'Best time to visit Bali with budget tips',
    'Suggest a romantic weekend trip from Bangalore',
  ];

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
  const [isSpeaking, setIsSpeaking] = useState(true);
  const [statusText, setStatusText] = useState('Ready');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const autoStopTimerRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, scrollToBottom]);

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

  const sendMessageText = async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned || isLoading) return;

    const userMessage: Message = { role: 'user', content: cleaned };
    setMessages((prev) => [...prev, userMessage, { role: 'assistant', content: PENDING_REPLY }]);
    setInput('');
    setIsLoading(true);
    setStatusText('Thinking...');

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
        const revisionSummary = `Done. I updated your itinerary and synced the Results page.\n\nUpdated title: ${revised.title}\nBest time: ${revised.best_time}\nHighlights: ${revised.highlights.slice(0, 2).join(' | ')}`;
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

      const chatMessages = [...messages, userMessage].map((m) => ({
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

      if (isSpeaking && fullResponse) {
        voiceAssistant.speak(fullResponse);
      }
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
      setStatusText('Ready');
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

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your chat history?')) {
      setMessages([INITIAL_MESSAGE]);
      localStorage.removeItem(STORAGE_KEY);
      setStatusText('Ready');
    }
  };

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
        setStatusText('Transcribing voice...');

        if (!audioBlob.size) return;

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
          setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I could not understand that audio. Please try again.' }]);
          setStatusText('Ready');
        } finally {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(300);
      setIsRecording(true);
      setStatusText('Recording...');
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
      setStatusText('Ready');
    }
  };

  const handleAudioButtonClick = () => {
    if (isLoading) return;

    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    handleStartRecording();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[550px] rounded-[2rem] shadow-2xl border border-sky-200/70 bg-gradient-to-b from-white to-sky-50 flex flex-col overflow-hidden"
          >
            <div className="bg-gradient-to-r from-sky-600 to-pink-500 p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-coral/20 flex items-center justify-center border border-white/20">
                  <Bot className="w-6 h-6 text-brand-amber" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Travel Expert AI</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-50">Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsSpeaking(!isSpeaking);
                    if (isSpeaking) voiceAssistant.stopSpeaking();
                  }}
                  title={isSpeaking ? 'Mute' : 'Unmute'}
                  className={`p-2 rounded-xl transition-colors ${isSpeaking ? 'text-brand-amber font-bold' : 'text-white/40'}`}
                >
                  {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={clearHistory}
                  title="Clear history"
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/70 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => void sendMessageText(prompt)}
                    disabled={isLoading || isRecording}
                    className="text-[10px] px-3 py-1.5 rounded-full bg-white/70 text-sky-700 border border-sky-200 hover:bg-white transition-colors disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide bg-gradient-to-b from-sky-50/30 to-pink-50/40">
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-pink-500 text-white' : 'bg-white text-sky-700 border border-sky-200'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-tr-none'
                        : 'bg-white text-slate-700 border border-sky-200 rounded-tl-none'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex gap-3 flex-row">
                    <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-white border border-sky-200 shadow-sm">
                      <Bot className="w-4 h-4 text-sky-700" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-sky-200 rounded-tl-none flex items-center gap-3 shadow-sm">
                      <div className="flex gap-1">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thinking</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {isLoading && (
              <div className="px-4 py-2 bg-white flex justify-center">
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-[10px] font-bold uppercase transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop
                </button>
              </div>
            )}

            <div className="p-5 border-t border-sky-200 bg-white/95">
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isRecording ? 'Recording... auto-send in a few seconds' : 'Ask a question...'}
                    disabled={isLoading}
                    className={`w-full py-4 px-5 pr-14 bg-sky-50/50 border border-sky-200 rounded-2xl focus:ring-2 focus:ring-sky-400 focus:border-transparent text-sm transition-all outline-none ${isRecording ? 'ring-2 ring-pink-400 animate-pulse' : ''}`}
                  />
                  <button
                    id="chat-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
                      input.trim() && !isLoading
                        ? 'bg-gradient-to-r from-sky-600 to-pink-500 text-white scale-100 hover:scale-105 active:scale-95'
                        : 'bg-gray-100 text-gray-400 scale-90 opacity-50'
                    }`}
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>

                <button
                  onClick={handleAudioButtonClick}
                  disabled={isLoading && !isRecording}
                  title={isRecording ? 'Stop recording and send' : 'Record audio'}
                  className={`p-4 rounded-2xl shadow-sm transition-all ${
                    isRecording
                      ? 'bg-pink-500 text-white scale-105 animate-pulse'
                      : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  <Mic className={`w-5 h-5 ${isRecording ? 'animate-bounce' : ''}`} />
                </button>
              </div>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-sky-600/80">
                Status: {statusText}
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-3 grayscale opacity-40">
                <div className="w-1 h-1 rounded-full bg-sky-500" />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-700">
                  Powered by Gemma + Audio Transcription
                </p>
                <div className="w-1 h-1 rounded-full bg-pink-400" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group w-16 h-16 bg-gradient-to-r from-sky-600 to-pink-500 rounded-[1.5rem] shadow-2xl flex items-center justify-center text-white border-2 border-white/40 hover:brightness-105 transition-all relative overflow-hidden"
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
