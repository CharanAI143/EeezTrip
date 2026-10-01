
export interface VoiceAssistantResult {
  transcript: string;
  isFinal: boolean;
}

export type VoiceAssistantErrorHandler = (error: string) => void;

export class VoiceAssistant {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListeningState: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else if (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis) {
      this.synthesis = (globalThis as any).speechSynthesis;
    }
  }

  public isSupported(): boolean {
    if (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) {
      return true;
    }
    if (typeof globalThis !== 'undefined' && ((globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition)) {
      return true;
    }
    return false;
  }

  public isSpeechSynthesisSupported(): boolean {
    return (
      (typeof window !== 'undefined' && 'speechSynthesis' in window) ||
      (typeof globalThis !== 'undefined' && 'speechSynthesis' in globalThis)
    );
  }

  public get isListening(): boolean {
    return this.isListeningState;
  }

  public startListening(
    onResult: (result: VoiceAssistantResult) => void,
    onEnd: () => void,
    onError?: VoiceAssistantErrorHandler
  ) {
    if (!this.isSupported()) {
      onError?.('Speech recognition is not supported in this browser.');
      onEnd();
      return;
    }

    // If currently running, abort previous session before starting new one
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }

    const SpeechRecognitionClass =
      (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      (typeof globalThis !== 'undefined' && ((globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition));

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      this.recognition = recognition;
      this.isListeningState = true;

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        let isFinal = false;

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res && res[0]) {
            fullTranscript += res[0].transcript;
          }
          if (res && (res.isFinal || res[0]?.isFinal)) {
            isFinal = true;
          }
        }

        onResult({
          transcript: fullTranscript.trim(),
          isFinal: isFinal,
        });
      };

      recognition.onend = () => {
        this.isListeningState = false;
        this.recognition = null;
        onEnd();
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        this.isListeningState = false;
        this.recognition = null;

        let errorMessage = 'Microphone or speech recognition error occurred.';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMessage = 'Microphone access was denied. Please allow microphone permissions in your browser.';
        } else if (event.error === 'no-speech') {
          errorMessage = 'No speech was detected. Please try speaking closer to the microphone.';
        } else if (event.error === 'audio-capture') {
          errorMessage = 'No microphone was found or microphone is not working.';
        } else if (event.error === 'network') {
          errorMessage = 'Speech recognition network error. Please check your connection.';
        } else if (event.error === 'aborted') {
          // Normal abort when user stops
          onEnd();
          return;
        }

        onError?.(errorMessage);
        onEnd();
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to initialize speech recognition:', err);
      this.isListeningState = false;
      this.recognition = null;
      onError?.(err?.message || 'Failed to start microphone.');
      onEnd();
    }
  }

  public stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.isListeningState = false;
    }
  }

  public abortListening() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
      this.isListeningState = false;
    }
  }

  public speak(text: string, onEnd?: () => void) {
    const synth =
      (typeof window !== 'undefined' && window.speechSynthesis)
        ? window.speechSynthesis
        : (typeof globalThis !== 'undefined' && (globalThis as any).speechSynthesis)
          ? (globalThis as any).speechSynthesis
          : this.synthesis;

    if (!synth) {
      onEnd?.();
      return;
    }

    try {
      synth.cancel();

      // Clean markdown or special chars for better speech clarity
      const cleanText = text
        .replace(/[*_#~`]/g, '')
        .replace(/\[.*?\]\(.*?\)/g, '')
        .slice(0, 400);

      if (!cleanText.trim()) {
        onEnd?.();
        return;
      }

      const SpeechUtteranceClass =
        (typeof window !== 'undefined' && (window as any).SpeechSynthesisUtterance) ||
        (typeof globalThis !== 'undefined' && (globalThis as any).SpeechSynthesisUtterance);

      if (!SpeechUtteranceClass) {
        onEnd?.();
        return;
      }

      const utterance = new SpeechUtteranceClass(cleanText);
      utterance.rate = 1;
      utterance.pitch = 1;

      // Keep reference to avoid browser garbage collection bug
      this.currentUtterance = utterance;

      utterance.onend = () => {
        this.currentUtterance = null;
        onEnd?.();
      };

      utterance.onerror = (err: any) => {
        console.warn('Speech synthesis utterance error:', err);
        this.currentUtterance = null;
        onEnd?.();
      };

      if (synth.paused) {
        synth.resume();
      }

      synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis failed:', e);
      this.currentUtterance = null;
      onEnd?.();
    }
  }

  public stopSpeaking() {
    const synth =
      this.synthesis ||
      (typeof window !== 'undefined' ? window.speechSynthesis : null) ||
      (typeof globalThis !== 'undefined' ? (globalThis as any).speechSynthesis : null);

    if (synth) {
      try {
        synth.cancel();
      } catch {
        // ignore
      }
    }
    this.currentUtterance = null;
  }
}

export const voiceAssistant = new VoiceAssistant();

