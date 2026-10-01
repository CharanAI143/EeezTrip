import React, { RefObject } from 'react';
import { motion } from 'motion/react';
import { Bot, User, Volume2, Square } from 'lucide-react';
import './chat-thread.css';

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
}

const WRAP_GUARDS: React.CSSProperties = {
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  whiteSpace: 'pre-wrap',
  hyphens: 'auto',
};

export const MessageBubble: React.FC<{
  msg: ThreadMessage;
  isSpeaking?: boolean;
  onReadAloud?: () => void;
}> = ({ msg, isSpeaking = false, onReadAloud }) => {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`chat-row ${isUser ? 'chat-row--user' : 'chat-row--bot'}`}
    >
      <div className="chat-row__line">
        <div className={`chat-avatar ${isUser ? 'chat-avatar--user' : 'chat-avatar--bot'}`}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
        <div className="bubble-group">
          <div
            className={`bubble ${isUser ? 'bubble--user' : 'bubble--bot'}`}
            style={WRAP_GUARDS}
          >
            <p className="bubble__text" style={WRAP_GUARDS}>
              {msg.content}
            </p>
          </div>
          {!isUser && onReadAloud && (
            <button
              onClick={onReadAloud}
              aria-label={isSpeaking ? 'Stop reading aloud' : 'Read this message aloud'}
              title={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
              className={`bubble__read-aloud grid h-7 w-7 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                isSpeaking
                  ? 'bg-sky-100 text-sky-700'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-sky-700'
              }`}
            >
              {isSpeaking ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export const ChatLog: React.FC<{
  messages: ThreadMessage[];
  isLoading: boolean;
  endRef: RefObject<HTMLDivElement | null>;
  speakingIndex?: number | null;
  onReadAloud?: (index: number, content: string) => void;
}> = ({ messages, isLoading, endRef, speakingIndex = null, onReadAloud }) => {
  const showThinking = isLoading && messages[messages.length - 1]?.role === 'user';

  return (
    <div role="log" aria-label="Chat messages" aria-live="polite" className="chat-log">
      {messages.map((msg, idx) => (
        <MessageBubble
          key={idx}
          msg={msg}
          isSpeaking={speakingIndex === idx}
          onReadAloud={onReadAloud ? () => onReadAloud(idx, msg.content) : undefined}
        />
      ))}
      {showThinking && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="chat-row chat-row--bot">
          <div className="chat-row__line">
            <div className="chat-avatar chat-avatar--bot">
              <Bot className="h-4 w-4" />
            </div>
            <div className="thinking">
              <div className="thinking__dots">
                <motion.span
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="thinking__dot thinking__dot--sky"
                />
                <motion.span
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="thinking__dot thinking__dot--pink"
                />
                <motion.span
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="thinking__dot thinking__dot--sky"
                />
              </div>
              <span className="thinking__label">Thinking</span>
            </div>
          </div>
        </motion.div>
      )}
      <div ref={endRef} />
    </div>
  );
};