import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTripStore } from '../state/tripStore';

// We use custom inline SVG icons to ensure consistency
const SparklesIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

import { sendConciergeChat, ConciergeChatResponse } from '../api/client';

export function AiConcierge() {
  const { state, reviseTrip } = useTripStore();
  const [isOpen, setIsOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [chatResponse, setChatResponse] = useState<ConciergeChatResponse | null>(null);
  const [chatLoading, setChatLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim() || state.revising || chatLoading) return;
    const text = instruction;
    setInstruction('');

    // Check if query is a direct revision command vs a concierge question
    const isRevision = ["cheaper", "extend", "shorten", "add day", "remove", "revise"].some(w => text.toLowerCase().includes(w));
    if (isRevision) {
      reviseTrip(text);
    } else {
      setChatLoading(true);
      try {
        const res = await sendConciergeChat(text, state.sessionId || undefined);
        setChatResponse(res);
      } catch {
        // Fallback to revision
        reviseTrip(text);
      } finally {
        setChatLoading(false);
      }
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999 }}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              bottom: 80,
              right: 0,
              width: 340,
              background: '#fff',
              borderRadius: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              border: '1px solid rgba(0,0,0,0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0284c7, #ec4899)',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#fff',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SparklesIcon />
                <span style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '1.1rem' }}>AI Concierge</span>
              </div>
              <button onClick={() => setIsOpen(false)} style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '50%',
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
              }}>
                <XIcon />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px', background: '#f8fafc', minHeight: 120 }}>
              {state.revising ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    border: '3px solid rgba(236,72,153,0.3)',
                    borderTopColor: '#ec4899',
                    animation: 'spin-slow 0.8s linear infinite',
                  }} />
                  <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.95rem' }}>Rewriting your trip...</span>
                  <span style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center' }}>This magic takes a few seconds.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    Not happy with the current plan? Tell me what to change!
                  </span>
                  {chatResponse && (
                    <div style={{
                      padding: '12px 16px', background: '#f0f9ff', border: '1px solid #bae6fd',
                      borderRadius: 14, color: '#0369a1', fontSize: '0.88rem', lineHeight: 1.5,
                      display: 'flex', flexDirection: 'column', gap: 6,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#0284c7', color: '#fff' }}>
                          {chatResponse.detected_intent.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#0284c7' }}>{Math.round(chatResponse.confidence * 100)}% Match</span>
                      </div>
                      <div style={{ whiteSpace: 'pre-line' }}>{chatResponse.reply}</div>
                    </div>
                  )}
                  {state.reviseError && (
                    <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', fontSize: '0.85rem' }}>
                      {state.reviseError}
                    </div>
                  )}
                  <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <input
                      type="text"
                      placeholder="e.g., 'Make day 2 kid-friendly'"
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      style={{
                        flex: 1, padding: '12px 16px', borderRadius: 12,
                        border: '1px solid #e2e8f0', background: '#fff',
                        outline: 'none', fontSize: '0.95rem',
                      }}
                    />
                    <button type="submit" disabled={!instruction.trim() || state.revising} style={{
                      background: instruction.trim() ? '#ec4899' : '#cbd5e1',
                      color: '#fff', border: 'none', borderRadius: 12,
                      width: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: instruction.trim() ? 'pointer' : 'not-allowed',
                      transition: 'background 0.2s',
                    }}>
                      <SendIcon />
                    </button>
                  </form>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {["Make it cheaper", "Add adventure", "Family-friendly", "Extend trip", "Shorten trip", "More food"].map(hint => (
                      <button
                        key={hint}
                        type="button"
                        onClick={() => {
                          setInstruction(hint);
                          reviseTrip(hint);
                        }}
                        style={{
                          fontSize: '0.75rem', padding: '6px 12px',
                          background: 'rgba(236,72,153,0.1)', color: '#db2777',
                          border: '1px solid rgba(236,72,153,0.2)', borderRadius: 999, cursor: 'pointer',
                          fontWeight: 600, transition: 'all 0.2s',
                        }}
                      >
                        {hint}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0284c7, #ec4899)',
          border: 'none', color: '#fff',
          boxShadow: '0 10px 25px rgba(236,72,153,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 10, position: 'relative'
        }}
      >
        {isOpen ? <XIcon /> : <SparklesIcon />}
      </motion.button>
    </div>
  );
}
