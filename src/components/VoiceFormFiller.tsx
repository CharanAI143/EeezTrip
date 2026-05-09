import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { voiceAssistant } from '../lib/voice';
import { extractTripDataFromVoice } from '../lib/gemini';

interface VoiceFormFillerProps {
  onDataExtracted: (data: {
    startLocation?: string;
    destination?: string;
    budget?: number;
    currency?: string;
    duration?: number;
    tripTypes?: string[];
    preferences?: string[];
  }) => void;
}

export const VoiceFormFiller: React.FC<VoiceFormFillerProps> = ({ onDataExtracted }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startVoiceCapture = () => {
    if (!voiceAssistant.isSupported()) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    setIsListening(true);
    setTranscript('');
    setIsSuccess(false);
    
    voiceAssistant.startListening(
      (result) => {
        setTranscript(result.transcript);
        if (result.isFinal) {
          processTranscript(result.transcript);
        }
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const processTranscript = async (text: string) => {
    if (text.length < 5) return;
    
    setIsProcessing(true);
    try {
      const data = await extractTripDataFromVoice(text);
      if (data && Object.keys(data).length > 0) {
        onDataExtracted(data);
        setIsSuccess(true);
        voiceAssistant.speak("Got it! I've filled in your trip details.");
        
        // Auto-clear success state
        setTimeout(() => setIsSuccess(false), 3000);
      } else {
        voiceAssistant.speak("Sorry, I couldn't understand the trip details. Try again?");
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      voiceAssistant.speak("Something went wrong processing your voice.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? () => voiceAssistant.stopListening() : startVoiceCapture}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all border-2 ${
          isListening 
            ? 'bg-brand-coral text-white border-white animate-pulse' 
            : isSuccess
              ? 'bg-green-500 text-white border-white'
              : 'bg-white text-brand-navy border-brand-border hover:border-brand-coral'
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isSuccess ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : isListening ? (
          <Mic className="w-6 h-6" />
        ) : (
          <MicOff className="w-6 h-6 opacity-40" />
        )}
      </motion.button>
      
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-64 bg-brand-navy text-white p-4 rounded-2xl border border-white/10 shadow-2xl z-[100]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Listening</span>
            </div>
            <p className="text-xs font-medium text-white/90 line-clamp-3 leading-relaxed">
              {transcript || "Try: 'Plan a trip to Tokyo from NYC with 5000 budget'"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
