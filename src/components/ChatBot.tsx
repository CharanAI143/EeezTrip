import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, Bot, User, Loader2, Minimize2, MapPin, Trash2, Square, Mic, Volume2, VolumeX } from 'lucide-react';
import { chatWithGemini } from '../lib/gemini';
import { voiceAssistant } from '../lib/voice';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'model';
  content: string;
}

const STORAGE_KEY = 'travel_planner_chat_history';
const INITIAL_MESSAGE: Message = { 
  role: 'model', 
  content: 'Hi there! 🌴 I am your travel assistant. Ask me anything about your trip, destinations, or travel tips!' 
};

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [INITIAL_MESSAGE];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    scrollToBottom();
    // Save to localStorage whenever messages change
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages, scrollToBottom]);

  const handleStartListening = () => {
    if (!voiceAssistant.isSupported()) return;
    
    setIsListening(true);
    voiceAssistant.startListening(
      (result) => {
        setInput(result.transcript);
        if (result.isFinal) {
          setIsListening(false);
          // Set timeout to ensure input state is updated before handleSend
          setTimeout(() => document.getElementById('chat-send-btn')?.click(), 100);
        }
      },
      () => setIsListening(false)
    );
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your chat history?')) {
      setMessages([INITIAL_MESSAGE]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      let firstChunk = true;
      let fullResponse = '';
      const chatMessages = [...messages, userMessage];
      
      await chatWithGemini(
        chatMessages, 
        (chunk) => {
          fullResponse = chunk;
          setMessages(prev => {
            const newMessages = [...prev];
            if (!firstChunk && newMessages[newMessages.length - 1].role === 'model') {
              newMessages[newMessages.length - 1] = { role: 'model', content: chunk };
            } else {
              newMessages.push({ role: 'model', content: chunk });
              firstChunk = false;
            }
            return newMessages;
          });
        },
        abortControllerRef.current.signal
      );

      if (isSpeaking && fullResponse) {
        voiceAssistant.speak(fullResponse);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[550px] bg-white rounded-[2rem] shadow-2xl border border-brand-border flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-brand-navy p-5 flex items-center justify-between text-white">
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
                  title={isSpeaking ? "Mute" : "Unmute"}
                  className={`p-2 rounded-xl transition-colors ${isSpeaking ? 'text-brand-amber font-bold' : 'text-white/40'}`}
                >
                  {isSpeaking ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button 
                  onClick={clearHistory}
                  title="Clear history"
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/60 hover:text-white"
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
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide bg-gray-50/50">
              {messages.map((msg, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user' ? 'bg-brand-coral text-white' : 'bg-white text-brand-navy border border-brand-border'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-brand-navy text-white rounded-tr-none' 
                        : 'bg-white text-brand-navy border border-brand-border rounded-tl-none'
                    }`}>
                      <div className="markdown-chat">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading && messages[messages.length - 1].role === 'user' && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] flex gap-3 flex-row">
                    <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center bg-white border border-brand-border shadow-sm">
                      <Bot className="w-4 h-4 text-brand-navy" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-brand-border rounded-tl-none flex items-center gap-3 shadow-sm">
                      <div className="flex gap-1">
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-brand-coral" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-brand-coral" />
                        <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-brand-coral" />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Thinking</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Overlay for Loading */}
            {isLoading && (
              <div className="px-4 py-2 bg-white flex justify-center">
                <button 
                  onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-[10px] font-bold uppercase transition-colors"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop Generating
                </button>
              </div>
            )}

            {/* Input */}
            <div className="p-5 border-t border-brand-border bg-white">
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={isListening ? "Listening..." : "Ask a question..."}
                    disabled={isLoading}
                    className={`w-full py-4 px-5 pr-14 bg-gray-50 border border-brand-border rounded-2xl focus:ring-2 focus:ring-brand-coral focus:border-transparent text-sm transition-all outline-none ${isListening ? 'ring-2 ring-brand-coral animate-pulse' : ''}`}
                  />
                  <button
                    id="chat-send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-xl transition-all ${
                      input.trim() && !isLoading 
                        ? 'bg-brand-navy text-white scale-100 hover:scale-105 active:scale-95' 
                        : 'bg-gray-100 text-gray-400 scale-90 opacity-50'
                    }`}
                  >
                    <Send className="w-4.5 h-4.5" />
                  </button>
                </div>
                
                <button
                  onClick={isListening ? () => voiceAssistant.stopListening() : handleStartListening}
                  className={`p-4 rounded-2xl shadow-sm transition-all ${
                    isListening 
                      ? 'bg-brand-coral text-white scale-105 animate-pulse' 
                      : 'bg-gray-50 text-brand-navy border border-brand-border hover:bg-gray-100'
                  }`}
                >
                  <Mic className={`w-5 h-5 ${isListening ? 'animate-bounce' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-3 grayscale opacity-40">
                <div className="w-1 h-1 rounded-full bg-brand-coral" />
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-brand-navy">
                  Powered by Fast Gemini Flash
                </p>
                <div className="w-1 h-1 rounded-full bg-brand-coral" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="group w-16 h-16 bg-brand-navy rounded-[1.5rem] shadow-2xl flex items-center justify-center text-white border-2 border-brand-coral/20 hover:bg-brand-slate transition-all relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-coral/10 to-transparent pointer-events-none" />
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-8 h-8 text-brand-amber drop-shadow-[0_0_8px_rgba(255,191,0,0.5)]" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="relative"
            >
              <MessageSquare className="w-8 h-8 text-brand-coral group-hover:text-brand-amber transition-colors" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-brand-coral rounded-full animate-ping" />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
          <div className="absolute top-0 right-0 p-1.5">
             <div className="w-2 h-2 bg-brand-amber rounded-full" />
          </div>
        )}
      </motion.button>
    </div>
  );
};
