import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { voiceAssistant } from '../lib/voice';
import { extractTripDataFromVoice } from '../lib/gemini';
import { transcribeAudio } from '../api/client';

interface VoiceFormFillerProps {
  onDataExtracted: (data: {
    startLocation?: string;
    destination?: string;
    budget?: number;
    currency?: string;
    duration?: number;
    travelStyle?: string;
    tripTypes?: string[];
    preferences?: string[];
  }) => void;
}

export const VoiceFormFiller: React.FC<VoiceFormFillerProps> = ({ onDataExtracted }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const transcriptRef = useRef('');
  const processedRef = useRef(false);
  const isProcessingRef = useRef(false);

  // Fallback MediaRecorder for browsers without Web Speech API
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      // Clean up when unmounting
      voiceAssistant.abortListening();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const processTranscript = async (text: string) => {
    const cleanText = text.trim();
    if (!cleanText || isProcessingRef.current || processedRef.current) return;

    if (cleanText.length < 3) {
      setErrorMessage('Audio was too short. Please try again.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    processedRef.current = true;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const data = await extractTripDataFromVoice(cleanText);
      if (data && (data.destination || data.startLocation || data.budget || data.duration)) {
        onDataExtracted(data);
        setIsSuccess(true);
        voiceAssistant.speak("Got it! I've filled in your trip details.");

        // Auto-clear success state
        setTimeout(() => {
          setIsSuccess(false);
        }, 3500);
      } else {
        setErrorMessage("Couldn't detect travel details. Try: 'Trip to Tokyo from NYC with 5000 budget'");
        voiceAssistant.speak("Sorry, I couldn't understand the destination. Try again?");
        setTimeout(() => setErrorMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      setErrorMessage('Failed to extract trip details.');
      voiceAssistant.speak('Something went wrong processing your voice.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const startMediaRecorderFallback = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Audio recording is not supported in this browser.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const selectedType = preferredTypes.find((type) =>
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
      );

      const recorder = selectedType
        ? new MediaRecorder(stream, { mimeType: selectedType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        audioChunksRef.current = [];

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }

        if (!audioBlob.size) return;

        setIsProcessing(true);
        try {
          const transcribed = await transcribeAudio(audioBlob);
          setTranscript(transcribed);
          if (transcribed.trim()) {
            await processTranscript(transcribed);
          } else {
            setErrorMessage('No speech heard. Please try again.');
            setTimeout(() => setErrorMessage(null), 4000);
          }
        } catch (err: any) {
          console.error('Fallback transcription error:', err);
          setErrorMessage(err?.message || 'Voice transcription failed.');
          setTimeout(() => setErrorMessage(null), 5000);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(300);
      setIsListening(true);
      setTranscript('');
      processedRef.current = false;
    } catch (err) {
      console.error('MediaRecorder error:', err);
      setErrorMessage('Microphone access was denied or unavailable.');
      setIsListening(false);
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const stopVoiceCapture = () => {
    setIsListening(false);

    if (voiceAssistant.isSupported()) {
      voiceAssistant.stopListening();
      // If we have accumulated speech, process it immediately
      if (transcriptRef.current && !processedRef.current) {
        processTranscript(transcriptRef.current);
      }
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const startVoiceCapture = () => {
    setErrorMessage(null);
    setIsSuccess(false);
    setTranscript('');
    transcriptRef.current = '';
    processedRef.current = false;

    if (voiceAssistant.isSupported()) {
      setIsListening(true);
      voiceAssistant.startListening(
        (result) => {
          transcriptRef.current = result.transcript;
          setTranscript(result.transcript);
          if (result.isFinal && result.transcript.trim()) {
            processTranscript(result.transcript);
          }
        },
        () => {
          setIsListening(false);
          // If stopped by silence or user, process accumulated transcript
          if (transcriptRef.current.trim() && !processedRef.current) {
            processTranscript(transcriptRef.current);
          }
        },
        (errorMsg) => {
          setErrorMessage(errorMsg);
          setIsListening(false);
          setTimeout(() => setErrorMessage(null), 5000);
        }
      );
    } else {
      // Cross-browser fallback using MediaRecorder + Backend transcription
      startMediaRecorderFallback();
    }
  };

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={isListening ? stopVoiceCapture : startVoiceCapture}
        aria-label={isListening ? 'Stop listening' : 'Start voice assistant'}
        title={isListening ? 'Click to stop listening' : 'Click to speak your trip details'}
        disabled={isProcessing}
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all border-2 cursor-pointer ${
          isListening
            ? 'bg-brand-coral text-white border-white animate-pulse shadow-brand-coral/40'
            : isSuccess
              ? 'bg-emerald-500 text-white border-white'
              : errorMessage
                ? 'bg-amber-500 text-white border-amber-300'
                : 'bg-white text-brand-navy border-brand-border hover:border-brand-coral hover:text-brand-coral'
        }`}
      >
        {isProcessing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : isSuccess ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : errorMessage ? (
          <AlertCircle className="w-6 h-6" />
        ) : (
          <Mic className={`w-6 h-6 ${isListening ? 'animate-bounce' : ''}`} />
        )}
      </motion.button>

      <AnimatePresence>
        {(isListening || errorMessage) && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute bottom-full mb-3 right-0 sm:left-1/2 sm:-translate-x-1/2 w-64 bg-brand-navy text-white p-3.5 rounded-2xl border border-white/15 shadow-2xl z-[100]"
          >
            {isListening ? (
              <>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                      Listening...
                    </span>
                  </div>
                  <span className="text-[10px] text-white/40">Click mic to stop</span>
                </div>
                <p className="text-xs font-medium text-white/95 line-clamp-3 leading-relaxed">
                  {transcript || "Speak clearly: 'Plan a trip to Tokyo from Paris for 5 days with 5000 budget'"}
                </p>
              </>
            ) : (
              <div className="text-xs text-amber-300 leading-relaxed font-medium">
                {errorMessage}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

